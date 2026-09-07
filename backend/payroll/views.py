import calendar

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsAdminOrHR

from .filters import PayrollFilter
from .models import Payroll
from .serializers import PayrollSerializer, PayrollStatusUpdateSerializer, PayslipSerializer


class PayrollListCreateView(generics.ListCreateAPIView):
    serializer_class = PayrollSerializer
    filterset_class = PayrollFilter
    search_fields = ["employee__first_name", "employee__last_name", "employee__employee_id"]
    ordering_fields = ["year", "month", "net_salary", "status"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminOrHR()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        qs = Payroll.objects.select_related("employee").all()
        if user.role in ("ADMIN", "HR"):
            return qs
        return qs.filter(employee__user=user)


class PayrollDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PayrollSerializer
    queryset = Payroll.objects.select_related("employee").all()

    # Full-record edits (salary figures) are only allowed while a payroll is
    # still in an editable pre-approval state. Once Approved or Paid, the
    # only way to change status is the controlled status-transition endpoint
    # below - the underlying salary figures can never be edited again.
    EDITABLE_STATUSES = (Payroll.Status.DRAFT, Payroll.Status.GENERATED)

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsAdminOrHR()]

    def get_object(self):
        obj = super().get_object()
        user = self.request.user
        if user.role not in ("ADMIN", "HR") and obj.employee.user_id != user.id:
            raise PermissionDenied("You do not have permission to access this payroll record.")
        return obj

    def update(self, request, *args, **kwargs):
        payroll = self.get_object()
        if payroll.status not in self.EDITABLE_STATUSES:
            return Response(
                {"detail": f"A payroll record that is {payroll.get_status_display()} can no longer be edited directly."},
                status=status.HTTP_409_CONFLICT,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        payroll = self.get_object()
        if payroll.status not in self.EDITABLE_STATUSES:
            return Response(
                {"detail": f"A payroll record that is {payroll.get_status_display()} can no longer be deleted."},
                status=status.HTTP_409_CONFLICT,
            )
        return super().destroy(request, *args, **kwargs)


class PayrollStatusUpdateView(APIView):
    """PATCH /api/payroll/<id>/status/ - move Draft -> Generated -> Approved -> Paid."""

    permission_classes = [IsAdminOrHR]

    def patch(self, request, pk):
        payroll = get_object_or_404(Payroll, pk=pk)
        serializer = PayrollStatusUpdateSerializer(payroll, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        payroll = serializer.save()
        return Response(PayrollSerializer(payroll).data)


class PayslipView(APIView):
    """GET /api/payroll/<id>/payslip/ - formatted payslip for a payroll record."""

    def get(self, request, pk):
        payroll = get_object_or_404(Payroll.objects.select_related("employee", "employee__department"), pk=pk)
        user = request.user
        if user.role not in ("ADMIN", "HR") and payroll.employee.user_id != user.id:
            raise PermissionDenied("You do not have permission to view this payslip.")

        data = {
            "company_name": settings.COMPANY_NAME,
            "company_address": settings.COMPANY_ADDRESS,
            "employee_id": payroll.employee.employee_id,
            "employee_name": payroll.employee.full_name,
            "department": payroll.employee.department.name,
            "designation": payroll.employee.designation,
            "payroll_month": f"{calendar.month_name[payroll.month]} {payroll.year}",
            "basic_salary": payroll.basic_salary,
            "allowances": payroll.allowances,
            "bonus": payroll.bonus,
            "overtime_amount": payroll.overtime_amount,
            "gross_salary": payroll.gross_salary,
            "tax_deduction": payroll.tax_deduction,
            "other_deductions": payroll.other_deductions,
            "leave_deduction_amount": payroll.leave_deduction_amount,
            "total_deductions": payroll.total_deductions,
            "net_salary": payroll.net_salary,
            "payment_status": payroll.status,
            "payment_date": payroll.payment_date,
        }
        return Response(PayslipSerializer(data).data, status=status.HTTP_200_OK)


class MyPayslipsView(generics.ListAPIView):
    """GET /api/payroll/my-payslips/ - convenience endpoint for the Employee role."""

    serializer_class = PayrollSerializer

    def get_queryset(self):
        return Payroll.objects.select_related("employee").filter(employee__user=self.request.user)
