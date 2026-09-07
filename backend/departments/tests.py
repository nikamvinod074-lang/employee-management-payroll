from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test.utils import CaptureQueriesContext
from django.db import connection
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from departments.models import Department
from employees.models import Employee

User = get_user_model()


class DepartmentTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="admin", email="admin@test.com", password="pass12345", role=User.Role.ADMIN)

    def test_create_department(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse("department-list-create"), {"name": "Engineering", "code": "eng"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["code"], "ENG")  # uppercased by validator

    def test_cannot_delete_department_with_employees(self):
        dept = Department.objects.create(name="Sales", code="SALES")
        Employee.objects.create(
            first_name="A", last_name="B", email="ab@test.com", phone="+911111111111",
            department=dept, designation="Rep", joining_date=date(2023, 1, 1), basic_salary=Decimal("30000"),
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(reverse("department-detail", kwargs={"pk": dept.pk}))
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertTrue(Department.objects.filter(pk=dept.pk).exists())

    def test_can_delete_empty_department(self):
        dept = Department.objects.create(name="Legal", code="LEGAL")
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(reverse("department-detail", kwargs={"pk": dept.pk}))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_employee_count_reflects_only_active_employees(self):
        dept = Department.objects.create(name="Ops", code="OPS")
        Employee.objects.create(
            first_name="Active", last_name="One", email="active@test.com", phone="+911111111112",
            department=dept, designation="Analyst", joining_date=date(2023, 1, 1),
            basic_salary=Decimal("30000"), employment_status="ACTIVE",
        )
        Employee.objects.create(
            first_name="Gone", last_name="Two", email="gone@test.com", phone="+911111111113",
            department=dept, designation="Analyst", joining_date=date(2023, 1, 1),
            basic_salary=Decimal("30000"), employment_status="TERMINATED",
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse("department-detail", kwargs={"pk": dept.pk}))
        self.assertEqual(response.data["employee_count"], 1)

    def test_department_list_does_not_have_n_plus_1_employee_count_queries(self):
        """
        Performance regression test: listing departments must not issue an
        extra COUNT query per department. The query count for 10 departments
        should be the same as for 2 - a small constant, not proportional to N.
        """
        for i in range(10):
            dept = Department.objects.create(name=f"Dept {i}", code=f"D{i}")
            Employee.objects.create(
                first_name=f"Emp{i}", last_name="Test", email=f"emp{i}@test.com", phone=f"+9111111111{i:02d}",
                department=dept, designation="Staff", joining_date=date(2023, 1, 1), basic_salary=Decimal("30000"),
            )

        self.client.force_authenticate(user=self.admin)
        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get(reverse("department-list-create"), {"page_size": 50})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 10)
        # A handful of fixed queries (auth, count, page) - not one-per-department.
        self.assertLess(len(ctx.captured_queries), 10)
