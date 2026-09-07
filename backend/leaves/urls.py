from django.urls import path

from . import views

urlpatterns = [
    path("", views.LeaveRequestListCreateView.as_view(), name="leave-list-create"),
    path("<int:pk>/", views.LeaveRequestDetailView.as_view(), name="leave-detail"),
    path("<int:pk>/review/", views.LeaveReviewView.as_view(), name="leave-review"),
]
