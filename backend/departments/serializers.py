from rest_framework import serializers

from .models import Department


class DepartmentSerializer(serializers.ModelSerializer):
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ["id", "name", "code", "description", "is_active", "employee_count", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_employee_count(self, obj):
        # Prefer the queryset annotation (no extra query) when the view
        # provides it; fall back to the model property for any other caller
        # (e.g. the Django admin, or the seed command) that doesn't annotate.
        annotated = getattr(obj, "active_employee_count", None)
        return annotated if annotated is not None else obj.employee_count

    def validate_code(self, value):
        return value.strip().upper()
