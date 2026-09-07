from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from departments.models import Department
from employees.models import Employee
from leaves.models import LeaveRequest

User = get_user_model()


class LeaveWorkflowTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="admin", email="admin@test.com", password="pass12345", role=User.Role.ADMIN)
        self.employee_user = User.objects.create_user(username="emp", email="emp@test.com", password="pass12345", role=User.Role.EMPLOYEE)
        self.department = Department.objects.create(name="Engineering", code="ENG")
        self.employee = Employee.objects.create(
            user=self.employee_user, first_name="Jane", last_name="Doe", email="jane@test.com",
            phone="+911234567890", department=self.department, designation="Engineer",
            joining_date=date(2023, 1, 1), basic_salary=Decimal("50000"),
        )

    def test_employee_can_apply_for_leave(self):
        self.client.force_authenticate(user=self.employee_user)
        response = self.client.post(reverse("leave-list-create"), {
            "leave_type": "CASUAL", "start_date": "2025-03-01", "end_date": "2025-03-02", "reason": "Personal",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "PENDING")
        self.assertEqual(response.data["number_of_days"], "2.0")

    def test_end_date_before_start_date_rejected(self):
        self.client.force_authenticate(user=self.employee_user)
        response = self.client.post(reverse("leave-list-create"), {
            "leave_type": "CASUAL", "start_date": "2025-03-05", "end_date": "2025-03-01", "reason": "Personal",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_hr_approval_workflow(self):
        leave = LeaveRequest.objects.create(
            employee=self.employee, leave_type="SICK", start_date=date(2025, 4, 1),
            end_date=date(2025, 4, 2), reason="Fever",
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse("leave-review", kwargs={"pk": leave.pk}), {
            "status": "APPROVED", "review_comments": "Get well soon",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        leave.refresh_from_db()
        self.assertEqual(leave.status, "APPROVED")
        self.assertEqual(leave.reviewed_by, self.admin)

    def test_overlapping_leave_rejected(self):
        LeaveRequest.objects.create(
            employee=self.employee, leave_type="CASUAL", start_date=date(2025, 5, 1),
            end_date=date(2025, 5, 5), reason="Trip", status="APPROVED",
        )
        self.client.force_authenticate(user=self.employee_user)
        response = self.client.post(reverse("leave-list-create"), {
            "leave_type": "SICK", "start_date": "2025-05-03", "end_date": "2025-05-04", "reason": "Overlap",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_employee_cannot_reassign_leave_ownership(self):
        """
        IDOR regression test: an employee updating their own pending leave
        request must not be able to change which employee it belongs to,
        even if they include 'employee' in the request body.
        """
        other_employee = Employee.objects.create(
            first_name="Other", last_name="Person", email="other3@test.com", phone="+911234567899",
            department=self.department, designation="Engineer", joining_date=date(2023, 1, 1),
            basic_salary=Decimal("40000"),
        )
        leave = LeaveRequest.objects.create(
            employee=self.employee, leave_type="CASUAL", start_date=date(2025, 6, 1),
            end_date=date(2025, 6, 2), reason="Original reason",
        )
        self.client.force_authenticate(user=self.employee_user)
        response = self.client.patch(reverse("leave-detail", kwargs={"pk": leave.pk}), {
            "employee": other_employee.id, "reason": "Attempted takeover",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        leave.refresh_from_db()
        # The reason was allowed to change, but ownership must not have moved.
        self.assertEqual(leave.reason, "Attempted takeover")
        self.assertEqual(leave.employee_id, self.employee.id)
        self.assertNotEqual(leave.employee_id, other_employee.id)

    def test_employee_cannot_edit_other_employees_leave(self):
        other_user = User.objects.create_user(username="other_emp", email="other4@test.com", password="pass12345", role=User.Role.EMPLOYEE)
        other_employee = Employee.objects.create(
            user=other_user, first_name="Other", last_name="Person", email="other5@test.com", phone="+911234567898",
            department=self.department, designation="Engineer", joining_date=date(2023, 1, 1),
            basic_salary=Decimal("40000"),
        )
        leave = LeaveRequest.objects.create(
            employee=other_employee, leave_type="CASUAL", start_date=date(2025, 7, 1), end_date=date(2025, 7, 2), reason="Not yours",
        )
        self.client.force_authenticate(user=self.employee_user)
        response = self.client.patch(reverse("leave-detail", kwargs={"pk": leave.pk}), {"reason": "Hijacked"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
