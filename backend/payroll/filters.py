import django_filters

from .models import Payroll


class PayrollFilter(django_filters.FilterSet):
    employee = django_filters.NumberFilter(field_name="employee_id")
    month = django_filters.NumberFilter(field_name="month")
    year = django_filters.NumberFilter(field_name="year")
    status = django_filters.CharFilter(field_name="status")

    class Meta:
        model = Payroll
        fields = ["employee", "month", "year", "status"]
