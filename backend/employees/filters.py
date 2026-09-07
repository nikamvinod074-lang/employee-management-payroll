import django_filters

from .models import Employee


class EmployeeFilter(django_filters.FilterSet):
    department = django_filters.NumberFilter(field_name="department_id")
    status = django_filters.CharFilter(field_name="employment_status")
    employment_type = django_filters.CharFilter(field_name="employment_type")
    joined_after = django_filters.DateFilter(field_name="joining_date", lookup_expr="gte")
    joined_before = django_filters.DateFilter(field_name="joining_date", lookup_expr="lte")

    class Meta:
        model = Employee
        fields = ["department", "status", "employment_type"]
