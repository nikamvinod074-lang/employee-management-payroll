import calendar

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsAdminOrHR
from employees.models import Employee

from .filters import AttendanceFilter
from .models import Attendance
from .serializers import AttendanceSerializer


class AttendanceListCreateView(generics.ListCreateAPIView):
    serializer_class = AttendanceSerializer
    filterset_class = AttendanceFilter
    search_fields = ["employee__first_name", "employee__last_name", "employee__employee_id"]
    ordering_fields = ["date", "status"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminOrHR()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        qs = Attendance.objects.select_related("employee").all()
        if user.role in ("ADMIN", "HR"):
            return qs
        return qs.filter(employee__user=user)


class AttendanceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AttendanceSerializer
    queryset = Attendance.objects.select_related("employee").all()

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsAdminOrHR()]

    def get_object(self):
        obj = super().get_object()
        user = self.request.user
        if user.role not in ("ADMIN", "HR") and obj.employee.user_id != user.id:
            raise PermissionDenied("You do not have permission to access this attendance record.")
        return obj


class EmployeeAttendanceSummaryView(APIView):
    """
    GET /api/attendance/summary/<employee_id>/?month=&year=
    Returns working days, present/absent/half/leave counts and percentage.
    """

    def get(self, request, employee_id):
        user = request.user
        employee = Employee.objects.filter(pk=employee_id).first()
        if employee is None:
            return Response({"detail": "Employee not found."}, status=404)
        if user.role not in ("ADMIN", "HR") and employee.user_id != user.id:
            raise PermissionDenied("You do not have permission to view this employee's attendance.")

        today = timezone.localdate()
        month = int(request.query_params.get("month", today.month))
        year = int(request.query_params.get("year", today.year))

        records = Attendance.objects.filter(employee=employee, date__year=year, date__month=month)
        total_days_in_month = calendar.monthrange(year, month)[1]
        working_days = sum(
            1 for day in range(1, total_days_in_month + 1)
            if calendar.weekday(year, month, day) < 5  # Mon-Fri as working days
        )

        present = records.filter(status=Attendance.Status.PRESENT).count()
        absent = records.filter(status=Attendance.Status.ABSENT).count()
        half_day = records.filter(status=Attendance.Status.HALF_DAY).count()
        leave = records.filter(status=Attendance.Status.LEAVE).count()

        effective_present = present + (half_day * 0.5)
        attendance_percentage = round((effective_present / working_days) * 100, 2) if working_days else 0

        return Response({
            "employee": employee.employee_id,
            "month": month,
            "year": year,
            "working_days": working_days,
            "present_days": present,
            "absent_days": absent,
            "half_days": half_day,
            "leave_days": leave,
            "attendance_percentage": attendance_percentage,
        })


class MonthlyAttendanceReportView(APIView):
    """
    Admin/HR: GET /api/attendance/report/?month=&year=&department=

    Runs in a constant 2 queries regardless of employee count: one for the
    employee roster (with department pre-joined) and one aggregate query
    that computes all four status counts for every employee at once via
    conditional Count() annotations - avoiding the previous N+1 pattern of
    one department lookup plus four COUNT queries per employee.
    """

    permission_classes = [IsAdminOrHR]

    def get(self, request):
        today = timezone.localdate()
        month = int(request.query_params.get("month", today.month))
        year = int(request.query_params.get("year", today.year))
        department_id = request.query_params.get("department")

        employees = Employee.objects.select_related("department").filter(
            employment_status=Employee.EmploymentStatus.ACTIVE
        )
        if department_id:
            employees = employees.filter(department_id=department_id)

        counts_by_employee = {
            row["employee_id"]: row
            for row in Attendance.objects.filter(
                employee__in=employees, date__year=year, date__month=month
            )
            .values("employee_id")
            .annotate(
                present=Count("id", filter=Q(status=Attendance.Status.PRESENT)),
                absent=Count("id", filter=Q(status=Attendance.Status.ABSENT)),
                half_day=Count("id", filter=Q(status=Attendance.Status.HALF_DAY)),
                leave=Count("id", filter=Q(status=Attendance.Status.LEAVE)),
            )
        }

        report = []
        for employee in employees:
            counts = counts_by_employee.get(employee.id, {})
            report.append({
                "employee_id": employee.employee_id,
                "full_name": employee.full_name,
                "department": employee.department.name,
                "present": counts.get("present", 0),
                "absent": counts.get("absent", 0),
                "half_day": counts.get("half_day", 0),
                "leave": counts.get("leave", 0),
            })
        return Response({"month": month, "year": year, "results": report})
