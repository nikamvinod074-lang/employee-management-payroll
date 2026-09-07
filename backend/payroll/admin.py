from django.contrib import admin

from .models import Payroll


@admin.register(Payroll)
class PayrollAdmin(admin.ModelAdmin):
    list_display = ("employee", "month", "year", "gross_salary", "net_salary", "status")
    list_filter = ("status", "year", "month")
    search_fields = ("employee__employee_id", "employee__first_name", "employee__last_name")
