from django.urls import path

from . import views

urlpatterns = [
    path("admin/", views.AdminDashboardView.as_view(), name="dashboard-admin"),
    path("employee/", views.EmployeeDashboardView.as_view(), name="dashboard-employee"),
]
