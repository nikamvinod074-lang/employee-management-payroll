from django.contrib.auth import get_user_model
from rest_framework import serializers

from departments.models import Department
from departments.serializers import DepartmentSerializer

from .models import Employee

User = get_user_model()


class EmployeeListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views/tables."""

    department_name = serializers.CharField(source="department.name", read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Employee
        fields = [
            "id", "employee_id", "full_name", "email", "phone", "department", "department_name",
            "designation", "employment_type", "employment_status", "joining_date", "profile_picture",
        ]


class EmployeeDetailSerializer(serializers.ModelSerializer):
    """Full serializer used for retrieve/create/update."""

    full_name = serializers.CharField(read_only=True)
    department_detail = DepartmentSerializer(source="department", read_only=True)

    class Meta:
        model = Employee
        fields = [
            "id", "employee_id", "user", "first_name", "last_name", "full_name", "email", "phone",
            "address", "date_of_birth", "gender", "profile_picture",
            "department", "department_detail", "designation", "joining_date",
            "employment_type", "employment_status", "basic_salary",
            "bank_name", "bank_account_number", "bank_ifsc_or_routing",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "employee_id", "created_at", "updated_at"]

    def validate_department(self, value):
        if not value.is_active:
            raise serializers.ValidationError("Cannot assign employee to an inactive department.")
        return value

    def validate_basic_salary(self, value):
        if value <= 0:
            raise serializers.ValidationError("Basic salary must be greater than zero.")
        return value


class EmployeeSelfUpdateSerializer(serializers.ModelSerializer):
    """
    Restricted serializer used when an Employee updates their own profile.
    Sensitive/administrative fields (salary, department, status, etc.) are
    intentionally excluded so employees cannot escalate their own record.
    """

    class Meta:
        model = Employee
        fields = ["phone", "address", "profile_picture"]


class EmployeeMiniSerializer(serializers.ModelSerializer):
    """Used to nest employee info inside attendance/leave/payroll responses."""

    full_name = serializers.CharField(read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Employee
        fields = ["id", "employee_id", "full_name", "department_name", "designation", "profile_picture"]
