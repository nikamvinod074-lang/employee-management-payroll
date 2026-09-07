from django.urls import path

from . import views

urlpatterns = [
    path("", views.AttendanceListCreateView.as_view(), name="attendance-list-create"),
    path("<int:pk>/", views.AttendanceDetailView.as_view(), name="attendance-detail"),
    path("summary/<int:employee_id>/", views.EmployeeAttendanceSummaryView.as_view(), name="attendance-summary"),
    path("report/", views.MonthlyAttendanceReportView.as_view(), name="attendance-report"),
]
