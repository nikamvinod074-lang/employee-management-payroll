from django.conf import settings
from django.db import models

from employees.models import Employee


class LeaveRequest(models.Model):
    class LeaveType(models.TextChoices):
        CASUAL = "CASUAL", "Casual Leave"
        SICK = "SICK", "Sick Leave"
        EARNED = "EARNED", "Earned Leave"
        UNPAID = "UNPAID", "Unpaid Leave"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        CANCELLED = "CANCELLED", "Cancelled"

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="leave_requests")
    leave_type = models.CharField(max_length=10, choices=LeaveType.choices)
    start_date = models.DateField()
    end_date = models.DateField()
    number_of_days = models.DecimalField(max_digits=5, decimal_places=1, editable=False)
    reason = models.TextField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)

    applied_date = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_leaves"
    )
    review_date = models.DateTimeField(null=True, blank=True)
    review_comments = models.TextField(blank=True)

    class Meta:
        ordering = ["-applied_date"]
        constraints = [
            models.CheckConstraint(condition=models.Q(end_date__gte=models.F("start_date")), name="leave_end_date_not_before_start_date"),
        ]
        indexes = [models.Index(fields=["status"]), models.Index(fields=["start_date", "end_date"])]

    def __str__(self):
        return f"{self.employee.employee_id} - {self.leave_type} ({self.start_date} to {self.end_date})"

    def save(self, *args, **kwargs):
        if self.start_date and self.end_date:
            self.number_of_days = (self.end_date - self.start_date).days + 1
        super().save(*args, **kwargs)
