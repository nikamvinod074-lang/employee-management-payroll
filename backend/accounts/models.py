import hashlib
import os
import secrets

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

RESET_TOKEN_TTL_MINUTES = int(os.getenv("PASSWORD_RESET_TOKEN_TTL_MIN", "30"))


def _default_token_expiry():
    return timezone.now() + timezone.timedelta(minutes=RESET_TOKEN_TTL_MINUTES)


class User(AbstractUser):
    """
    Custom user model. Authentication is done via email + password.
    `role` drives all role-based authorization across the system.
    """

    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        HR = "HR", "HR"
        EMPLOYEE = "EMPLOYEE", "Employee"

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.EMPLOYEE)
    must_change_password = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.email} ({self.role})"

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def is_hr(self):
        return self.role == self.Role.HR

    @property
    def is_employee_role(self):
        return self.role == self.Role.EMPLOYEE


class PasswordResetToken(models.Model):
    """
    Supports a forgot/reset-password flow with real security properties:

    - The raw token is never stored - only its SHA-256 hash - so a database
      compromise doesn't hand out usable reset tokens.
    - Tokens expire after RESET_TOKEN_TTL_MINUTES.
    - Tokens are one-time use (`used`).
    - Issuing a new token invalidates every other outstanding token for that
      user (see `issue()`), so an attacker who captured an older token can't
      use it after the user requests a fresh one.

    In production the raw token would be emailed to the user. It is returned
    in the API response only when `settings.DEBUG` is True, purely so the
    reset flow can be demonstrated end-to-end without email infrastructure -
    this must never happen outside local/demo use.
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reset_tokens")
    token_hash = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=_default_token_expiry)
    used = models.BooleanField(default=False)

    class Meta:
        indexes = [models.Index(fields=["token_hash"])]

    def __str__(self):
        return f"Reset token for {self.user.email}"

    @staticmethod
    def _hash(raw_token: str) -> str:
        return hashlib.sha256(raw_token.encode()).hexdigest()

    @classmethod
    def issue(cls, user) -> str:
        """Invalidates any outstanding tokens for this user and issues a new one."""
        cls.objects.filter(user=user, used=False).update(used=True)
        raw_token = secrets.token_urlsafe(32)
        cls.objects.create(
            user=user,
            token_hash=cls._hash(raw_token),
            expires_at=timezone.now() + timezone.timedelta(minutes=RESET_TOKEN_TTL_MINUTES),
        )
        return raw_token

    @classmethod
    def consume(cls, raw_token: str):
        """
        Looks up a token by its hash and marks it used atomically-enough for
        this use case. Returns the associated user, or None if the token is
        missing, expired, or already used - callers should treat all of
        these cases identically to avoid leaking which case occurred.
        """
        try:
            record = cls.objects.select_related("user").get(token_hash=cls._hash(raw_token), used=False)
        except cls.DoesNotExist:
            return None
        if record.expires_at < timezone.now():
            return None
        record.used = True
        record.save(update_fields=["used"])
        return record.user
