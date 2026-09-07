import django_filters

from .models import LeaveRequest


class LeaveRequestFilter(django_filters.FilterSet):
    employee = django_filters.NumberFilter(field_name="employee_id")
    status = django_filters.CharFilter(field_name="status")
    leave_type = django_filters.CharFilter(field_name="leave_type")
    date_from = django_filters.DateFilter(field_name="start_date", lookup_expr="gte")
    date_to = django_filters.DateFilter(field_name="end_date", lookup_expr="lte")

    class Meta:
        model = LeaveRequest
        fields = ["employee", "status", "leave_type"]
