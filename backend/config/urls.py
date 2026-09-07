from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/employees/", include("employees.urls")),
    path("api/departments/", include("departments.urls")),
    path("api/attendance/", include("attendance.urls")),
    path("api/leaves/", include("leaves.urls")),
    path("api/payroll/", include("payroll.urls")),
    path("api/dashboard/", include("dashboard.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
