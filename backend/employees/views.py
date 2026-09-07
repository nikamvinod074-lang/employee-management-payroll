from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from common.permissions import IsAdminOrHR

from .filters import EmployeeFilter
from .models import Employee
from .serializers import EmployeeDetailSerializer, EmployeeListSerializer, EmployeeSelfUpdateSerializer


class EmployeeListCreateView(generics.ListCreateAPIView):
    """
    Admin/HR: full list + create.
    Employees are restricted to their own record (enforced in get_queryset).
    """

    filterset_class = EmployeeFilter
    search_fields = ["first_name", "last_name", "employee_id", "email", "designation"]
    ordering_fields = ["first_name", "last_name", "joining_date", "basic_salary", "created_at"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminOrHR()]
        return super().get_permissions()

    def get_serializer_class(self):
        return EmployeeDetailSerializer if self.request.method == "POST" else EmployeeListSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Employee.objects.select_related("department").all()
        if user.role in ("ADMIN", "HR"):
            return qs
        # Employees can only ever see their own record via this endpoint.
        return qs.filter(user=user)


class EmployeeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Employee.objects.select_related("department").all()

    def get_serializer_class(self):
        user = self.request.user
        if user.role in ("ADMIN", "HR"):
            return EmployeeDetailSerializer
        if self.request.method in ("PUT", "PATCH"):
            return EmployeeSelfUpdateSerializer
        return EmployeeDetailSerializer

    def get_object(self):
        obj = super().get_object()
        user = self.request.user
        if user.role not in ("ADMIN", "HR") and obj.user_id != user.id:
            raise PermissionDenied("You do not have permission to access this employee's record.")
        return obj

    def destroy(self, request, *args, **kwargs):
        if request.user.role not in ("ADMIN", "HR"):
            raise PermissionDenied("Only Admin or HR can remove employees.")
        employee = self.get_object()
        # Soft-delete by default to preserve payroll/attendance history & integrity.
        employee.employment_status = Employee.EmploymentStatus.TERMINATED
        employee.save(update_fields=["employment_status"])
        return Response({"detail": "Employee has been deactivated (soft-deleted) to preserve historical records."},
                         status=status.HTTP_200_OK)
