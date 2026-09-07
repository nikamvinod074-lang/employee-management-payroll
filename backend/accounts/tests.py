from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import PasswordResetToken

User = get_user_model()


class AuthTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin", email="admin@test.com", password="Admin@12345", role=User.Role.ADMIN
        )

    def test_login_success(self):
        url = reverse("auth-login")
        response = self.client.post(url, {"email": "admin@test.com", "password": "Admin@12345"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["role"], "ADMIN")

    def test_login_wrong_password(self):
        url = reverse("auth-login")
        response = self.client.post(url, {"email": "admin@test.com", "password": "wrong"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_requires_auth(self):
        url = reverse("auth-me")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_authenticated(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse("auth-me"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "admin@test.com")

    def test_change_password(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse("auth-change-password"), {
            "old_password": "Admin@12345", "new_password": "NewPass@123",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.check_password("NewPass@123"))

    def test_change_password_wrong_old(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse("auth-change-password"), {
            "old_password": "wrong", "new_password": "NewPass@123",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class PasswordResetSecurityTests(APITestCase):
    """Regression tests for the password reset security hardening."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="resetme", email="resetme@test.com", password="OldPass@123", role=User.Role.EMPLOYEE
        )

    def _request_reset_token(self):
        with override_settings(DEBUG=True):
            response = self.client.post(reverse("auth-forgot-password"), {"email": "resetme@test.com"})
        return response.data.get("token")

    def test_forgot_password_does_not_reveal_whether_email_exists(self):
        response_existing = self.client.post(reverse("auth-forgot-password"), {"email": "resetme@test.com"})
        response_missing = self.client.post(reverse("auth-forgot-password"), {"email": "doesnotexist@test.com"})
        self.assertEqual(response_existing.status_code, status.HTTP_200_OK)
        self.assertEqual(response_missing.status_code, status.HTTP_200_OK)
        self.assertEqual(response_existing.data["detail"], response_missing.data["detail"])

    def test_token_only_returned_in_debug_mode(self):
        with override_settings(DEBUG=False):
            response = self.client.post(reverse("auth-forgot-password"), {"email": "resetme@test.com"})
        self.assertNotIn("token", response.data)

    def test_valid_token_resets_password(self):
        token = self._request_reset_token()
        self.assertIsNotNone(token)
        response = self.client.post(reverse("auth-reset-password"), {"token": token, "new_password": "NewPass@123"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPass@123"))

    def test_token_cannot_be_reused(self):
        token = self._request_reset_token()
        self.client.post(reverse("auth-reset-password"), {"token": token, "new_password": "NewPass@123"})
        second_attempt = self.client.post(reverse("auth-reset-password"), {"token": token, "new_password": "AnotherPass@123"})
        self.assertEqual(second_attempt.status_code, status.HTTP_400_BAD_REQUEST)

    def test_expired_token_is_rejected(self):
        token = self._request_reset_token()
        # Force the token's expiry into the past.
        record = PasswordResetToken.objects.get(user=self.user, used=False)
        record.expires_at = timezone.now() - timezone.timedelta(minutes=1)
        record.save(update_fields=["expires_at"])

        response = self.client.post(reverse("auth-reset-password"), {"token": token, "new_password": "NewPass@123"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_requesting_new_token_invalidates_previous_one(self):
        first_token = self._request_reset_token()
        second_token = self._request_reset_token()
        self.assertNotEqual(first_token, second_token)

        # The first token must no longer work, even though it hasn't expired.
        response = self.client.post(reverse("auth-reset-password"), {"token": first_token, "new_password": "NewPass@123"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # The second (latest) token must still work.
        response = self.client.post(reverse("auth-reset-password"), {"token": second_token, "new_password": "NewPass@123"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_invalid_token_gives_generic_error(self):
        response = self.client.post(reverse("auth-reset-password"), {"token": "not-a-real-token", "new_password": "NewPass@123"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("invalid or has expired", response.data["detail"])

    def test_reset_password_invalidates_existing_sessions(self):
        login = self.client.post(reverse("auth-login"), {"email": "resetme@test.com", "password": "OldPass@123"})
        refresh_token = login.data["refresh"]

        token = self._request_reset_token()
        self.client.post(reverse("auth-reset-password"), {"token": token, "new_password": "NewPass@123"})

        refresh_response = self.client.post(reverse("token-refresh"), {"refresh": refresh_token})
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)
