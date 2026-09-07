from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models

from departments.models import Department


def profile_picture_path(instance, filename):
    return f"profile_pictures/{instance.employee_id}/{filename}"


class Employee(models.Model):
    class EmploymentType(models.TextChoices):
        FULL_TIME = "FULL_TIME", "Full-time"
        PART_TIME = "PART_TIME", "Part-time"
        CONTRACT = "CONTRACT", "Contract"
        INTERN = "INTERN", "Intern"

    class EmploymentStatus(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"
        RESIGNED = "RESIGNED", "Resigned"
        TERMINATED = "TERMINATED", "Terminated"

    class Gender(models.TextChoices):
        MALE = "MALE", "Male"
        FEMALE = "FEMALE", "Female"
        OTHER = "OTHER", "Other"
        PREFER_NOT_TO_SAY = "PREFER_NOT_TO_SAY", "Prefer not to say"

    # Link to login account. Nullable because Admin/HR may create an employee
    # record before (or without) issuing a login account.
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="employee_profile"
    )

    employee_id = models.CharField(max_length=20, unique=True, editable=False, db_index=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone_regex = RegexValidator(regex=r"^\+?[0-9\-\s]{7,15}$", message="Enter a valid phone number.")
    phone = models.CharField(validators=[phone_regex], max_length=17)
    address = models.TextField(blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, choices=Gender.choices, default=Gender.PREFER_NOT_TO_SAY)
    profile_picture = models.ImageField(upload_to=profile_picture_path, null=True, blank=True)

    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="employees")
    designation = models.CharField(max_length=100)
    joining_date = models.DateField()
    employment_type = models.CharField(max_length=20, choices=EmploymentType.choices, default=EmploymentType.FULL_TIME)
    employment_status = models.CharField(max_length=20, choices=EmploymentStatus.choices, default=EmploymentStatus.ACTIVE)

    basic_salary = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])

    # Bank details - placeholder fields (sensitive; only exposed to Admin/HR/self)
    bank_name = models.CharField(max_length=100, blank=True)
    bank_account_number = models.CharField(max_length=34, blank=True)
    bank_ifsc_or_routing = models.CharField(max_length=20, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["employee_id"]),
            models.Index(fields=["last_name", "first_name"]),
            models.Index(fields=["employment_status"]),
        ]

    def __str__(self):
        return f"{self.employee_id} - {self.full_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def save(self, *args, **kwargs):
        if not self.employee_id:
            self.employee_id = self._generate_employee_id()
        super().save(*args, **kwargs)

    @staticmethod
    def _generate_employee_id():
        last = Employee.objects.order_by("-id").first()
        next_num = (last.id + 1) if last else 1
        return f"EMP{next_num:05d}"
