from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from departments.models import Department
from employees.models import Employee

User = get_user_model()


class EmployeeCRUDTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="admin", email="admin@test.com", password="pass12345", role=User.Role.ADMIN)
        self.hr = User.objects.create_user(username="hr", email="hr@test.com", password="pass12345", role=User.Role.HR)
        self.employee_user = User.objects.create_user(username="emp", email="emp@test.com", password="pass12345", role=User.Role.EMPLOYEE)
        self.department = Department.objects.create(name="Engineering", code="ENG")
        self.employee = Employee.objects.create(
            user=self.employee_user, first_name="Jane", last_name="Doe", email="jane@test.com",
            phone="+911234567890", department=self.department, designation="Engineer",
            joining_date=date(2023, 1, 1), basic_salary=Decimal("50000"),
        )

    def test_employee_id_auto_generated(self):
        self.assertTrue(self.employee.employee_id.startswith("EMP"))

    def test_admin_can_list_all_employees(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse("employee-list-create"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_employee_role_only_sees_self(self):
        Employee.objects.create(
            first_name="Other", last_name="Person", email="other@test.com", phone="+911234567891",
            department=self.department, designation="Engineer", joining_date=date(2023, 1, 1),
            basic_salary=Decimal("40000"),
        )
        self.client.force_authenticate(user=self.employee_user)
        response = self.client.get(reverse("employee-list-create"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["employee_id"], self.employee.employee_id)

    def test_employee_role_cannot_create(self):
        self.client.force_authenticate(user=self.employee_user)
        response = self.client.post(reverse("employee-list-create"), {
            "first_name": "New", "last_name": "Person", "email": "new@test.com", "phone": "+911234567892",
            "department": self.department.id, "designation": "Engineer", "joining_date": "2023-01-01",
            "basic_salary": "40000",
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_hr_can_create_employee(self):
        self.client.force_authenticate(user=self.hr)
        response = self.client.post(reverse("employee-list-create"), {
            "first_name": "New", "last_name": "Person", "email": "new2@test.com", "phone": "+911234567893",
            "department": self.department.id, "designation": "Engineer", "joining_date": "2023-01-01",
            "basic_salary": "40000",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_negative_salary_rejected(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse("employee-list-create"), {
            "first_name": "Bad", "last_name": "Salary", "email": "bad@test.com", "phone": "+911234567894",
            "department": self.department.id, "designation": "Engineer", "joining_date": "2023-01-01",
            "basic_salary": "-100",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_employee_cannot_access_other_profile(self):
        other = Employee.objects.create(
            first_name="Other", last_name="Person", email="other2@test.com", phone="+911234567895",
            department=self.department, designation="Engineer", joining_date=date(2023, 1, 1),
            basic_salary=Decimal("40000"),
        )
        self.client.force_authenticate(user=self.employee_user)
        response = self.client.get(reverse("employee-detail", kwargs={"pk": other.pk}))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_soft_deactivates(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(reverse("employee-detail", kwargs={"pk": self.employee.pk}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.employee.refresh_from_db()
        self.assertEqual(self.employee.employment_status, "TERMINATED")
