from django.urls import path

from . import views

urlpatterns = [
    path("", views.PayrollListCreateView.as_view(), name="payroll-list-create"),
    path("my-payslips/", views.MyPayslipsView.as_view(), name="my-payslips"),
    path("<int:pk>/", views.PayrollDetailView.as_view(), name="payroll-detail"),
    path("<int:pk>/status/", views.PayrollStatusUpdateView.as_view(), name="payroll-status-update"),
    path("<int:pk>/payslip/", views.PayslipView.as_view(), name="payroll-payslip"),
]
