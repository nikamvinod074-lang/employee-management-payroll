from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import PasswordResetToken, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    model = User
    list_display = ("email", "username", "first_name", "last_name", "role", "is_active", "is_staff")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("email", "username", "first_name", "last_name")
    ordering = ("email",)
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Role", {"fields": ("role", "must_change_password")}),
    )


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    # Note: the raw token is never stored (only its hash), so it is
    # deliberately not shown here.
    list_display = ("user", "used", "created_at", "expires_at")
    search_fields = ("user__email",)
    readonly_fields = ("token_hash", "created_at")
