from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from attendance.models import Attendance
from departments.models import Department
from employees.models import Employee

User = get_user_model()


class AttendanceTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="admin", email="admin@test.com", password="pass12345", role=User.Role.ADMIN)
        self.department = Department.objects.create(name="Engineering", code="ENG")
        self.employee = Employee.objects.create(
            first_name="Jane", last_name="Doe", email="jane@test.com", phone="+911234567890",
            department=self.department, designation="Engineer", joining_date=date(2023, 1, 1),
            basic_salary=Decimal("50000"),
        )

    def test_mark_attendance(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse("attendance-list-create"), {
            "employee": self.employee.id, "date": "2025-01-10", "status": "PRESENT",
            "check_in": "09:00:00", "check_out": "18:00:00",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_duplicate_attendance_rejected(self):
        Attendance.objects.create(employee=self.employee, date=date(2025, 1, 10), status="PRESENT")
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse("attendance-list-create"), {
            "employee": self.employee.id, "date": "2025-01-10", "status": "ABSENT",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_checkout_before_checkin_rejected(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse("attendance-list-create"), {
            "employee": self.employee.id, "date": "2025-02-10", "status": "PRESENT",
            "check_in": "18:00:00", "check_out": "09:00:00",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_employee_can_view_own_attendance_detail(self):
        employee_user = User.objects.create_user(username="emp2", email="emp2@test.com", password="pass12345", role=User.Role.EMPLOYEE)
        self.employee.user = employee_user
        self.employee.save(update_fields=["user"])
        record = Attendance.objects.create(employee=self.employee, date=date(2025, 3, 1), status="PRESENT")
        self.client.force_authenticate(user=employee_user)
        response = self.client.get(reverse("attendance-detail", kwargs={"pk": record.pk}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_employee_cannot_view_others_attendance_detail(self):
        other_user = User.objects.create_user(username="other_att", email="otherattend@test.com", password="pass12345", role=User.Role.EMPLOYEE)
        record = Attendance.objects.create(employee=self.employee, date=date(2025, 3, 2), status="PRESENT")
        self.client.force_authenticate(user=other_user)
        response = self.client.get(reverse("attendance-detail", kwargs={"pk": record.pk}))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_monthly_report_has_no_n_plus_1_queries(self):
        """
        Performance regression test: the monthly attendance report must run
        in a small constant number of queries regardless of employee count.
        """
        for i in range(10):
            emp = Employee.objects.create(
                first_name=f"Staff{i}", last_name="Member", email=f"staff{i}@test.com", phone=f"+9122222222{i:02d}",
                department=self.department, designation="Staff", joining_date=date(2023, 1, 1), basic_salary=Decimal("30000"),
            )
            Attendance.objects.create(employee=emp, date=date(2025, 4, 1), status="PRESENT")

        self.client.force_authenticate(user=self.admin)
        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get(reverse("attendance-report"), {"month": 4, "year": 2025})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # 10 newly created employees plus the one from setUp = 11.
        self.assertEqual(len(response.data["results"]), 11)
        self.assertLess(len(ctx.captured_queries), 8)
