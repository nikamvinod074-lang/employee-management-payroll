from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from departments.models import Department
from employees.models import Employee
from payroll.models import Payroll
from payroll.services import calculate_payroll

User = get_user_model()


class PayrollCalculationTests(APITestCase):
    """Unit tests for the core payroll calculation business logic."""

    def test_basic_gross_and_net_calculation(self):
        payroll = Payroll(
            basic_salary=Decimal("30000"), allowances=Decimal("5000"), bonus=Decimal("2000"),
            overtime_hours=Decimal("10"), overtime_rate_per_hour=Decimal("100"),
            tax_deduction=Decimal("3000"), other_deductions=Decimal("500"), leave_deduction_days=Decimal("0"),
        )
        calculate_payroll(payroll)
        # Gross = 30000 + 5000 + 2000 + (10*100) = 38000
        self.assertEqual(payroll.gross_salary, Decimal("38000.00"))
        # Deductions = 3000 + 500 + 0 = 3500
        self.assertEqual(payroll.total_deductions, Decimal("3500.00"))
        # Net = 38000 - 3500 = 34500
        self.assertEqual(payroll.net_salary, Decimal("34500.00"))

    def test_leave_deduction_reduces_net_salary(self):
        payroll = Payroll(
            basic_salary=Decimal("30000"), allowances=Decimal("0"), bonus=Decimal("0"),
            overtime_hours=Decimal("0"), overtime_rate_per_hour=Decimal("0"),
            tax_deduction=Decimal("0"), other_deductions=Decimal("0"), leave_deduction_days=Decimal("3"),
        )
        calculate_payroll(payroll)
        # per-day = 30000/30 = 1000; leave deduction = 3000
        self.assertEqual(payroll.leave_deduction_amount, Decimal("3000.00"))
        self.assertEqual(payroll.net_salary, Decimal("27000.00"))

    def test_net_salary_never_negative(self):
        payroll = Payroll(
            basic_salary=Decimal("1000"), allowances=Decimal("0"), bonus=Decimal("0"),
            overtime_hours=Decimal("0"), overtime_rate_per_hour=Decimal("0"),
            tax_deduction=Decimal("5000"), other_deductions=Decimal("0"), leave_deduction_days=Decimal("0"),
        )
        calculate_payroll(payroll)
        self.assertEqual(payroll.net_salary, Decimal("0.00"))


class PayrollAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="admin", email="admin@test.com", password="pass12345", role=User.Role.ADMIN)
        self.department = Department.objects.create(name="Engineering", code="ENG")
        self.employee = Employee.objects.create(
            first_name="Jane", last_name="Doe", email="jane@test.com", phone="+911234567890",
            department=self.department, designation="Engineer", joining_date=date(2023, 1, 1),
            basic_salary=Decimal("50000"),
        )

    def test_create_payroll_computes_net_salary_serverside(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse("payroll-list-create"), {
            "employee": self.employee.id, "month": 1, "year": 2025,
            "basic_salary": "50000", "allowances": "5000", "bonus": "0",
            "overtime_hours": "0", "overtime_rate_per_hour": "0",
            "tax_deduction": "5000", "other_deductions": "0", "leave_deduction_days": "0",
            # Client attempts to inject a net_salary directly - must be ignored (read-only field).
            "net_salary": "999999",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["net_salary"], "50000.00")
        self.assertNotEqual(response.data["net_salary"], "999999")

    def test_duplicate_payroll_for_same_month_rejected(self):
        Payroll.objects.create(employee=self.employee, month=1, year=2025, basic_salary=Decimal("50000"))
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse("payroll-list-create"), {
            "employee": self.employee.id, "month": 1, "year": 2025, "basic_salary": "50000",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_payslip_endpoint(self):
        payroll = Payroll.objects.create(employee=self.employee, month=1, year=2025, basic_salary=Decimal("50000"))
        calculate_payroll(payroll)
        payroll.save()
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse("payroll-payslip", kwargs={"pk": payroll.pk}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["employee_id"], self.employee.employee_id)
        self.assertIn("net_salary", response.data)

    def test_basic_salary_always_snapshotted_from_employee(self):
        """
        Salary integrity regression test: even if the client submits a
        basic_salary that doesn't match the employee's actual record, the
        server must ignore it and snapshot the employee's real value.
        """
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse("payroll-list-create"), {
            "employee": self.employee.id, "month": 2, "year": 2025,
            "basic_salary": "1",  # employee's real basic_salary is 50000 - this must be ignored
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["basic_salary"], "50000.00")

    def test_status_cannot_skip_from_draft_to_paid(self):
        payroll = Payroll.objects.create(employee=self.employee, month=3, year=2025, basic_salary=Decimal("50000"), status="DRAFT")
        calculate_payroll(payroll)
        payroll.save()
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(reverse("payroll-status-update", kwargs={"pk": payroll.pk}), {
            "status": "PAID", "payment_date": "2025-03-31",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_valid_forward_transition_succeeds(self):
        payroll = Payroll.objects.create(employee=self.employee, month=3, year=2025, basic_salary=Decimal("50000"), status="DRAFT")
        calculate_payroll(payroll)
        payroll.save()
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(reverse("payroll-status-update", kwargs={"pk": payroll.pk}), {"status": "GENERATED"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payroll.refresh_from_db()
        self.assertEqual(payroll.status, "GENERATED")

    def test_hr_cannot_revert_status_backward(self):
        hr = User.objects.create_user(username="hr2", email="hr2@test.com", password="pass12345", role=User.Role.HR)
        payroll = Payroll.objects.create(employee=self.employee, month=4, year=2025, basic_salary=Decimal("50000"), status="GENERATED")
        calculate_payroll(payroll)
        payroll.save()
        self.client.force_authenticate(user=hr)
        response = self.client.patch(reverse("payroll-status-update", kwargs={"pk": payroll.pk}), {"status": "DRAFT"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_revert_status_backward(self):
        payroll = Payroll.objects.create(employee=self.employee, month=4, year=2025, basic_salary=Decimal("50000"), status="GENERATED")
        calculate_payroll(payroll)
        payroll.save()
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(reverse("payroll-status-update", kwargs={"pk": payroll.pk}), {"status": "DRAFT"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_paid_payroll_is_terminal(self):
        payroll = Payroll.objects.create(
            employee=self.employee, month=5, year=2025, basic_salary=Decimal("50000"),
            status="PAID", payment_date=date(2025, 5, 31),
        )
        calculate_payroll(payroll)
        payroll.save()
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(reverse("payroll-status-update", kwargs={"pk": payroll.pk}), {"status": "APPROVED"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_paid_payroll_cannot_be_edited_directly(self):
        payroll = Payroll.objects.create(
            employee=self.employee, month=6, year=2025, basic_salary=Decimal("50000"),
            status="PAID", payment_date=date(2025, 6, 30),
        )
        calculate_payroll(payroll)
        payroll.save()
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(reverse("payroll-detail", kwargs={"pk": payroll.pk}), {"allowances": "999999"})
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        payroll.refresh_from_db()
        self.assertNotEqual(payroll.allowances, Decimal("999999"))

    def test_paid_payroll_cannot_be_deleted(self):
        payroll = Payroll.objects.create(
            employee=self.employee, month=7, year=2025, basic_salary=Decimal("50000"),
            status="PAID", payment_date=date(2025, 7, 31),
        )
        calculate_payroll(payroll)
        payroll.save()
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(reverse("payroll-detail", kwargs={"pk": payroll.pk}))
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertTrue(Payroll.objects.filter(pk=payroll.pk).exists())

    def test_employee_cannot_view_other_employees_payroll(self):
        other_user = User.objects.create_user(username="other_pay", email="otherpay@test.com", password="pass12345", role=User.Role.EMPLOYEE)
        payroll = Payroll.objects.create(employee=self.employee, month=8, year=2025, basic_salary=Decimal("50000"))
        calculate_payroll(payroll)
        payroll.save()
        self.client.force_authenticate(user=other_user)
        response = self.client.get(reverse("payroll-detail", kwargs={"pk": payroll.pk}))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
