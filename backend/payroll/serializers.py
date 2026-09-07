from rest_framework import serializers

from employees.serializers import EmployeeMiniSerializer

from .models import Payroll
from .services import calculate_payroll


class PayrollSerializer(serializers.ModelSerializer):
    employee_detail = EmployeeMiniSerializer(source="employee", read_only=True)

    class Meta:
        model = Payroll
        fields = [
            "id", "employee", "employee_detail", "month", "year",
            "basic_salary", "allowances", "bonus", "overtime_hours", "overtime_rate_per_hour",
            "tax_deduction", "other_deductions", "leave_deduction_days",
            "overtime_amount", "leave_deduction_amount", "gross_salary", "total_deductions", "net_salary",
            "status", "payment_date", "created_at", "updated_at",
        ]
        read_only_fields = [
            # basic_salary is intentionally read-only: it is always snapshotted from the
            # employee's current record at generation time (see create()/update() below).
            # This guarantees Payroll.basic_salary can never drift from or be entered
            # inconsistently with Employee.basic_salary.
            "id", "basic_salary", "overtime_amount", "leave_deduction_amount", "gross_salary",
            "total_deductions", "net_salary", "created_at", "updated_at",
        ]

    def validate_month(self, value):
        if not 1 <= value <= 12:
            raise serializers.ValidationError("Month must be between 1 and 12.")
        return value

    def validate(self, attrs):
        employee = attrs.get("employee", getattr(self.instance, "employee", None))
        month = attrs.get("month", getattr(self.instance, "month", None))
        year = attrs.get("year", getattr(self.instance, "year", None))

        qs = Payroll.objects.filter(employee=employee, month=month, year=year)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A payroll record already exists for this employee for this month/year.")
        return attrs

    def create(self, validated_data):
        employee = validated_data["employee"]
        payroll = Payroll(**validated_data)
        payroll.basic_salary = employee.basic_salary  # always snapshot the current basic salary
        calculate_payroll(payroll)
        payroll.status = Payroll.Status.GENERATED
        payroll.save()
        return payroll

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        # Re-snapshot in case the employee (or their salary) was changed since creation.
        instance.basic_salary = (validated_data.get("employee") or instance.employee).basic_salary
        calculate_payroll(instance)
        instance.save()
        return instance


class PayrollStatusUpdateSerializer(serializers.Serializer):
    """
    Enforces a controlled payroll workflow:

        DRAFT -> GENERATED -> APPROVED -> PAID

    Forward transitions must move exactly one step at a time (no skipping,
    e.g. DRAFT -> PAID is rejected). Backward transitions (correcting a
    mistake before payment) are allowed one step at a time but only for
    Admin users - HR cannot revert an approval. PAID is terminal: once a
    payroll is marked Paid it can never be changed again through this
    endpoint, protecting the historical salary record.
    """

    status = serializers.ChoiceField(choices=Payroll.Status.choices)
    payment_date = serializers.DateField(required=False, allow_null=True)

    FORWARD = {
        Payroll.Status.DRAFT: Payroll.Status.GENERATED,
        Payroll.Status.GENERATED: Payroll.Status.APPROVED,
        Payroll.Status.APPROVED: Payroll.Status.PAID,
    }
    BACKWARD = {
        Payroll.Status.GENERATED: Payroll.Status.DRAFT,
        Payroll.Status.APPROVED: Payroll.Status.GENERATED,
    }

    def validate(self, attrs):
        instance = self.instance
        current = instance.status
        target = attrs["status"]
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if current == Payroll.Status.PAID:
            raise serializers.ValidationError(
                "This payroll has already been paid and can no longer be modified."
            )

        if target == current:
            raise serializers.ValidationError({"status": "Payroll is already in this status."})

        if self.FORWARD.get(current) == target:
            pass  # valid single-step forward transition
        elif self.BACKWARD.get(current) == target:
            if not (user and user.role == "ADMIN"):
                raise serializers.ValidationError(
                    "Only an Admin can revert payroll to a previous status."
                )
        else:
            raise serializers.ValidationError(
                {"status": f"Cannot move payroll from {current} directly to {target}."}
            )

        if target == Payroll.Status.PAID and not attrs.get("payment_date"):
            raise serializers.ValidationError({"payment_date": "Payment date is required when marking payroll as Paid."})
        return attrs

    def update(self, instance, validated_data):
        instance.status = validated_data["status"]
        if "payment_date" in validated_data:
            instance.payment_date = validated_data["payment_date"]
        instance.save()
        return instance


class PayslipSerializer(serializers.Serializer):
    """Read-only, formatted representation of a payroll record as a payslip."""

    company_name = serializers.CharField()
    company_address = serializers.CharField()
    employee_id = serializers.CharField()
    employee_name = serializers.CharField()
    department = serializers.CharField()
    designation = serializers.CharField()
    payroll_month = serializers.CharField()
    basic_salary = serializers.DecimalField(max_digits=12, decimal_places=2)
    allowances = serializers.DecimalField(max_digits=12, decimal_places=2)
    bonus = serializers.DecimalField(max_digits=12, decimal_places=2)
    overtime_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    gross_salary = serializers.DecimalField(max_digits=12, decimal_places=2)
    tax_deduction = serializers.DecimalField(max_digits=12, decimal_places=2)
    other_deductions = serializers.DecimalField(max_digits=12, decimal_places=2)
    leave_deduction_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_deductions = serializers.DecimalField(max_digits=12, decimal_places=2)
    net_salary = serializers.DecimalField(max_digits=12, decimal_places=2)
    payment_status = serializers.CharField()
    payment_date = serializers.DateField(allow_null=True)
