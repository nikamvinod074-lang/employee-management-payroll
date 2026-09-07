from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

from employees.models import Employee


class Payroll(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        GENERATED = "GENERATED", "Generated"
        APPROVED = "APPROVED", "Approved"
        PAID = "PAID", "Paid"

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="payrolls")
    month = models.PositiveSmallIntegerField()
    year = models.PositiveSmallIntegerField()

    basic_salary = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])
    allowances = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MinValueValidator(Decimal("0"))])
    bonus = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MinValueValidator(Decimal("0"))])
    overtime_hours = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0.00"), validators=[MinValueValidator(Decimal("0"))])
    overtime_rate_per_hour = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"), validators=[MinValueValidator(Decimal("0"))])

    tax_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MinValueValidator(Decimal("0"))])
    other_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MinValueValidator(Decimal("0"))])
    leave_deduction_days = models.DecimalField(max_digits=5, decimal_places=1, default=Decimal("0.0"), validators=[MinValueValidator(Decimal("0"))])

    # Computed & stored (never editable directly by the client) - see services.calculate_payroll
    overtime_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"), editable=False)
    leave_deduction_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"), editable=False)
    gross_salary = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"), editable=False)
    total_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"), editable=False)
    net_salary = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"), editable=False)

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    payment_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-year", "-month"]
        constraints = [
            models.UniqueConstraint(fields=["employee", "month", "year"], name="unique_payroll_per_employee_per_month"),
            models.CheckConstraint(condition=models.Q(month__gte=1) & models.Q(month__lte=12), name="payroll_month_between_1_and_12"),
        ]
        indexes = [models.Index(fields=["month", "year"]), models.Index(fields=["status"])]

    def __str__(self):
        return f"{self.employee.employee_id} - {self.month}/{self.year} ({self.status})"
