from django.db.models import Count, ProtectedError, Q
from rest_framework import generics, status
from rest_framework.response import Response

from common.permissions import ReadOnlyOrAdminHR

from .models import Department
from .serializers import DepartmentSerializer


class DepartmentListCreateView(generics.ListCreateAPIView):
    # employee_count is annotated here (a single JOIN + GROUP BY) instead of
    # relying on the per-instance Department.employee_count property, which
    # would otherwise issue one extra COUNT query per department in the list
    # (classic N+1).
    queryset = Department.objects.annotate(
        active_employee_count=Count("employees", filter=Q(employees__employment_status="ACTIVE"))
    ).order_by("name")
    serializer_class = DepartmentSerializer
    permission_classes = [ReadOnlyOrAdminHR]
    filterset_fields = ["is_active"]
    search_fields = ["name", "code"]
    ordering_fields = ["name", "created_at"]


class DepartmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Department.objects.annotate(
        active_employee_count=Count("employees", filter=Q(employees__employment_status="ACTIVE"))
    )
    serializer_class = DepartmentSerializer
    permission_classes = [ReadOnlyOrAdminHR]

    def destroy(self, request, *args, **kwargs):
        department = self.get_object()
        if department.employees.exists():
            return Response(
                {"detail": "Cannot delete a department that still has employees assigned to it. "
                            "Reassign or deactivate those employees first."},
                status=status.HTTP_409_CONFLICT,
            )
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "Cannot delete this department because related records exist."},
                status=status.HTTP_409_CONFLICT,
            )
