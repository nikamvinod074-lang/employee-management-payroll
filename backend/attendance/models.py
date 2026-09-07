from django.db import models

from employees.models import Employee


class Attendance(models.Model):
    class Status(models.TextChoices):
        PRESENT = "PRESENT", "Present"
        ABSENT = "ABSENT", "Absent"
        HALF_DAY = "HALF_DAY", "Half Day"
        LEAVE = "LEAVE", "Leave"

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="attendance_records")
    date = models.DateField()
    check_in = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PRESENT)
    notes = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date"]
        constraints = [
            models.UniqueConstraint(fields=["employee", "date"], name="unique_attendance_per_employee_per_day")
        ]
        indexes = [models.Index(fields=["date"]), models.Index(fields=["status"])]

    def __str__(self):
        return f"{self.employee.employee_id} - {self.date} - {self.status}"
