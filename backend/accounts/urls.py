from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("login/", views.LoginView.as_view(), name="auth-login"),
    path("logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", views.MeView.as_view(), name="auth-me"),
    path("change-password/", views.ChangePasswordView.as_view(), name="auth-change-password"),
    path("forgot-password/", views.ForgotPasswordView.as_view(), name="auth-forgot-password"),
    path("reset-password/", views.ResetPasswordView.as_view(), name="auth-reset-password"),
    path("users/", views.UserListCreateView.as_view(), name="user-list-create"),
    path("users/<int:pk>/", views.UserDetailView.as_view(), name="user-detail"),
]
