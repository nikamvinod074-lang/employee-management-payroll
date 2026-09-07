from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from attendance.models import Attendance
from departments.models import Department
from employees.models import Employee
from leaves.models import LeaveRequest
from payroll.models import Payroll


class AdminDashboardView(APIView):
    """GET /api/dashboard/admin/ - Admin (and HR) overview stats + chart data."""

    def get(self, request):
        if request.user.role not in ("ADMIN", "HR"):
            raise PermissionDenied("You do not have permission to view this dashboard.")

        today = timezone.localdate()

        total_employees = Employee.objects.count()
        active_employees = Employee.objects.filter(employment_status=Employee.EmploymentStatus.ACTIVE).count()
        total_departments = Department.objects.filter(is_active=True).count()
        pending_leaves = LeaveRequest.objects.filter(status=LeaveRequest.Status.PENDING).count()

        monthly_payroll_total = Payroll.objects.filter(
            month=today.month, year=today.year
        ).aggregate(total=Sum("net_salary"))["total"] or 0

        today_attendance = Attendance.objects.filter(date=today)
        attendance_overview = {
            "present": today_attendance.filter(status=Attendance.Status.PRESENT).count(),
            "absent": today_attendance.filter(status=Attendance.Status.ABSENT).count(),
            "half_day": today_attendance.filter(status=Attendance.Status.HALF_DAY).count(),
            "leave": today_attendance.filter(status=Attendance.Status.LEAVE).count(),
        }

        employees_by_department = list(
            Department.objects.annotate(count=Count("employees")).values("name", "count").order_by("-count")
        )

        employees_by_status = list(
            Employee.objects.values("employment_status").annotate(count=Count("id")).order_by("-count")
        )

        monthly_payroll_trend = []
        month, year = today.month, today.year
        for _ in range(6):
            total = Payroll.objects.filter(month=month, year=year).aggregate(total=Sum("net_salary"))["total"] or 0
            monthly_payroll_trend.insert(0, {"month": month, "year": year, "total": float(total)})
            month -= 1
            if month == 0:
                month, year = 12, year - 1

        recent_employees = list(
            Employee.objects.order_by("-created_at")[:5].values(
                "employee_id", "first_name", "last_name", "department__name", "created_at"
            )
        )
        recent_leaves = list(
            LeaveRequest.objects.select_related("employee").order_by("-applied_date")[:5].values(
                "employee__employee_id", "employee__first_name", "employee__last_name",
                "leave_type", "status", "applied_date",
            )
        )

        return Response({
            "total_employees": total_employees,
            "active_employees": active_employees,
            "total_departments": total_departments,
            "pending_leave_requests": pending_leaves,
            "monthly_payroll_total": monthly_payroll_total,
            "attendance_overview": attendance_overview,
            "charts": {
                "employees_by_department": employees_by_department,
                "employees_by_status": employees_by_status,
                "monthly_payroll_trend": monthly_payroll_trend,
            },
            "recent_employees": recent_employees,
            "recent_leave_requests": recent_leaves,
        })


class EmployeeDashboardView(APIView):
    """GET /api/dashboard/employee/ - the logged-in employee's own snapshot."""

    def get(self, request):
        employee = Employee.objects.filter(user=request.user).select_related("department").first()
        if employee is None:
            raise PermissionDenied("No employee profile is linked to your account.")

        today = timezone.localdate()
        today_attendance = Attendance.objects.filter(employee=employee, date=today).first()

        month_records = Attendance.objects.filter(employee=employee, date__year=today.year, date__month=today.month)
        attendance_summary = {
            "present": month_records.filter(status=Attendance.Status.PRESENT).count(),
            "absent": month_records.filter(status=Attendance.Status.ABSENT).count(),
            "half_day": month_records.filter(status=Attendance.Status.HALF_DAY).count(),
            "leave": month_records.filter(status=Attendance.Status.LEAVE).count(),
        }

        leave_balance = {
            "pending": LeaveRequest.objects.filter(employee=employee, status=LeaveRequest.Status.PENDING).count(),
            "approved_this_year": LeaveRequest.objects.filter(
                employee=employee, status=LeaveRequest.Status.APPROVED, start_date__year=today.year
            ).aggregate(total=Sum("number_of_days"))["total"] or 0,
        }

        latest_payslip = Payroll.objects.filter(employee=employee).order_by("-year", "-month").first()
        latest_payslip_data = None
        if latest_payslip:
            latest_payslip_data = {
                "id": latest_payslip.id,
                "month": latest_payslip.month,
                "year": latest_payslip.year,
                "net_salary": latest_payslip.net_salary,
                "status": latest_payslip.status,
            }

        return Response({
            "employee": {
                "employee_id": employee.employee_id,
                "full_name": employee.full_name,
                "department": employee.department.name,
                "designation": employee.designation,
            },
            "today_attendance": today_attendance.status if today_attendance else "NOT_MARKED",
            "attendance_summary": attendance_summary,
            "leave_balance": leave_balance,
            "latest_payslip": latest_payslip_data,
        })
