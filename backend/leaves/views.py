from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsAdminOrHR
from employees.models import Employee

from .filters import LeaveRequestFilter
from .models import LeaveRequest
from .serializers import LeaveRequestSelfUpdateSerializer, LeaveRequestSerializer, LeaveReviewSerializer


class LeaveRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = LeaveRequestSerializer
    filterset_class = LeaveRequestFilter
    search_fields = ["employee__first_name", "employee__last_name", "employee__employee_id", "reason"]
    ordering_fields = ["applied_date", "start_date", "status"]

    def get_queryset(self):
        user = self.request.user
        qs = LeaveRequest.objects.select_related("employee", "reviewed_by").all()
        if user.role in ("ADMIN", "HR"):
            return qs
        return qs.filter(employee__user=user)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role in ("ADMIN", "HR"):
            # Admin/HR may file leave on behalf of an employee (employee id supplied in payload).
            serializer.save()
        else:
            employee = Employee.objects.filter(user=user).first()
            if employee is None:
                raise PermissionDenied("No employee profile is linked to your account.")
            serializer.save(employee=employee)


class LeaveRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = LeaveRequest.objects.select_related("employee", "reviewed_by").all()

    def get_serializer_class(self):
        user = self.request.user
        if user.role not in ("ADMIN", "HR") and self.request.method in ("PUT", "PATCH"):
            # Employee self-service update: 'employee' is never accepted, so
            # ownership of the request can't be changed via this endpoint.
            return LeaveRequestSelfUpdateSerializer
        return LeaveRequestSerializer

    def get_object(self):
        obj = super().get_object()
        user = self.request.user
        if user.role not in ("ADMIN", "HR") and obj.employee.user_id != user.id:
            raise PermissionDenied("You do not have permission to access this leave request.")
        return obj

    def update(self, request, *args, **kwargs):
        leave = self.get_object()
        user = request.user
        if user.role not in ("ADMIN", "HR"):
            # Employees may only edit/cancel their own request while it is pending.
            if leave.status != LeaveRequest.Status.PENDING:
                return Response({"detail": "Only pending leave requests can be modified."}, status=400)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        leave = self.get_object()
        if leave.status != LeaveRequest.Status.PENDING:
            return Response({"detail": "Only pending leave requests can be deleted."}, status=400)
        return super().destroy(request, *args, **kwargs)


class LeaveReviewView(APIView):
    """POST /api/leaves/<id>/review/ - Admin/HR approves or rejects a request."""

    permission_classes = [IsAdminOrHR]

    def post(self, request, pk):
        try:
            leave = LeaveRequest.objects.get(pk=pk)
        except LeaveRequest.DoesNotExist:
            return Response({"detail": "Leave request not found."}, status=404)

        if leave.status != LeaveRequest.Status.PENDING:
            return Response({"detail": "This leave request has already been reviewed."}, status=400)

        serializer = LeaveReviewSerializer(leave, data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        leave = serializer.save()
        return Response(LeaveRequestSerializer(leave).data, status=status.HTTP_200_OK)
