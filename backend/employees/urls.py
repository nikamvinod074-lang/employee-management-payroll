from django.urls import path

from . import views

urlpatterns = [
    path("", views.EmployeeListCreateView.as_view(), name="employee-list-create"),
    path("<int:pk>/", views.EmployeeDetailView.as_view(), name="employee-detail"),
]
