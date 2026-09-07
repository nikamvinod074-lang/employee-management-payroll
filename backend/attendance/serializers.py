from rest_framework import serializers

from employees.serializers import EmployeeMiniSerializer

from .models import Attendance


class AttendanceSerializer(serializers.ModelSerializer):
    employee_detail = EmployeeMiniSerializer(source="employee", read_only=True)

    class Meta:
        model = Attendance
        fields = [
            "id", "employee", "employee_detail", "date", "check_in", "check_out",
            "status", "notes", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        validators = []  # replaced by explicit validate() for a clearer duplicate-record error

    def validate(self, attrs):
        employee = attrs.get("employee", getattr(self.instance, "employee", None))
        date = attrs.get("date", getattr(self.instance, "date", None))
        check_in = attrs.get("check_in", getattr(self.instance, "check_in", None))
        check_out = attrs.get("check_out", getattr(self.instance, "check_out", None))

        qs = Attendance.objects.filter(employee=employee, date=date)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                {"date": "An attendance record already exists for this employee on this date."}
            )

        if check_in and check_out and check_out <= check_in:
            raise serializers.ValidationError({"check_out": "Check-out time must be after check-in time."})
        return attrs
