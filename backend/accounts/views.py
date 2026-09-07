from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from common.permissions import IsAdmin

from .models import PasswordResetToken
from .serializers import (
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    UserCreateSerializer,
    UserSerializer,
)

User = get_user_model()


def _blacklist_all_outstanding_tokens(user):
    """Blacklists every refresh token issued to this user, ending all active sessions."""
    for outstanding in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=outstanding)


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/  -> access, refresh, user"""

    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


class LogoutView(APIView):
    """POST /api/auth/logout/ - blacklists the supplied refresh token."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"detail": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Logged out successfully."}, status=status.HTTP_205_RESET_CONTENT)


class MeView(APIView):
    """GET /api/auth/me/ - the currently authenticated user."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.must_change_password = False
        user.save(update_fields=["password", "must_change_password"])
        # Invalidate other outstanding sessions; the current access token stays
        # valid until it naturally expires (it isn't tracked per-request here),
        # but no further refreshes will succeed on any other device.
        _blacklist_all_outstanding_tokens(user)
        return Response({"detail": "Password changed successfully."})


class ForgotPasswordView(APIView):
    """
    POST /api/auth/forgot-password/
    Issues a one-time, expiring reset token and invalidates any previously
    issued tokens for the same user. In a real deployment the raw token
    would be emailed to the user; for local/demo use (DEBUG=True only) it is
    returned in the response body so the reset flow can be exercised without
    email infrastructure. The response is identical whether or not the email
    exists, so this endpoint never reveals which emails are registered.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        response = {"detail": "If an account with that email exists, a reset link has been generated."}
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response(response)

        raw_token = PasswordResetToken.issue(user)
        if settings.DEBUG:
            response["token"] = raw_token  # demo/dev convenience only - never enabled in production
        return Response(response)


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = PasswordResetToken.consume(serializer.validated_data["token"])
        if user is None:
            # Deliberately generic: don't reveal whether the token was invalid,
            # expired, or already used.
            return Response({"detail": "This reset link is invalid or has expired."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])

        # Invalidate every outstanding JWT session for this user so a
        # password reset actually terminates existing access, including on
        # any device where an attacker may have an active session.
        _blacklist_all_outstanding_tokens(user)

        return Response({"detail": "Password has been reset. You can now log in."})


class UserListCreateView(generics.ListCreateAPIView):
    """Admin-only: manage login accounts (used mainly for HR/Admin accounts)."""

    queryset = User.objects.all()
    permission_classes = [IsAdmin]
    filterset_fields = ["role", "is_active"]
    search_fields = ["email", "first_name", "last_name", "username"]
    ordering_fields = ["date_joined", "email"]

    def get_serializer_class(self):
        return UserCreateSerializer if self.request.method == "POST" else UserSerializer


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
