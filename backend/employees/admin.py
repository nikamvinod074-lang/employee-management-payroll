from django.contrib import admin

from .models import Employee


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("employee_id", "full_name", "department", "designation", "employment_status")
    search_fields = ("employee_id", "first_name", "last_name", "email")
    list_filter = ("department", "employment_status", "employment_type")
