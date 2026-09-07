import random
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from attendance.models import Attendance
from departments.models import Department
from employees.models import Employee
from leaves.models import LeaveRequest
from payroll.models import Payroll
from payroll.services import calculate_payroll

User = get_user_model()

DEPARTMENTS = [
    ("Information Technology", "IT"),
    ("Human Resources", "HR"),
    ("Finance", "FIN"),
    ("Sales", "SALES"),
    ("Marketing", "MKT"),
    ("Operations", "OPS"),
]

DESIGNATIONS = {
    "IT": ["Software Engineer", "Senior Software Engineer", "QA Engineer", "DevOps Engineer", "Engineering Manager"],
    "HR": ["HR Executive", "HR Manager", "Talent Acquisition Specialist"],
    "FIN": ["Accountant", "Finance Analyst", "Finance Manager"],
    "SALES": ["Sales Executive", "Account Manager", "Sales Manager"],
    "MKT": ["Marketing Executive", "Content Strategist", "Marketing Manager"],
    "OPS": ["Operations Executive", "Operations Manager"],
}

FIRST_NAMES = ["Aarav", "Vivaan", "Aditi", "Diya", "Kabir", "Meera", "Rohan", "Isha", "Arjun", "Sneha",
               "Karan", "Priya", "Vikram", "Anjali", "Rahul", "Neha", "Sanjay", "Pooja", "Amit", "Kavya"]
LAST_NAMES = ["Sharma", "Verma", "Iyer", "Reddy", "Gupta", "Nair", "Rao", "Mehta", "Kapoor", "Joshi"]


class Command(BaseCommand):
    help = "Populates the database with demo data: admin/HR/employee users, departments, attendance, leave, payroll."

    def add_arguments(self, parser):
        parser.add_argument("--employees", type=int, default=15, help="Number of employee records to create.")
        parser.add_argument("--flush", action="store_true", help="Delete existing demo data before seeding.")

    @transaction.atomic
    def handle(self, *args, **options):
        if options["flush"]:
            self.stdout.write("Flushing existing data...")
            Payroll.objects.all().delete()
            LeaveRequest.objects.all().delete()
            Attendance.objects.all().delete()
            Employee.objects.all().delete()
            Department.objects.all().delete()
            User.objects.exclude(is_superuser=True).delete()

        self.stdout.write("Creating departments...")
        departments = {}
        for name, code in DEPARTMENTS:
            dept, _ = Department.objects.get_or_create(code=code, defaults={"name": name})
            departments[code] = dept

        self.stdout.write("Creating admin & HR accounts...")
        admin_user, created = User.objects.get_or_create(
            email="admin@company.com",
            defaults={"username": "admin", "first_name": "System", "last_name": "Admin",
                      "role": User.Role.ADMIN, "is_staff": True, "is_superuser": True},
        )
        if created:
            admin_user.set_password("Admin@12345")
            admin_user.save()

        hr_user, created = User.objects.get_or_create(
            email="hr@company.com",
            defaults={"username": "hr_manager", "first_name": "Hannah", "last_name": "Reddy", "role": User.Role.HR},
        )
        if created:
            hr_user.set_password("Hr@12345")
            hr_user.save()

        self.stdout.write(f"Creating {options['employees']} employees...")
        employees = []
        for i in range(options["employees"]):
            first = random.choice(FIRST_NAMES)
            last = random.choice(LAST_NAMES)
            dept_code = random.choice(list(departments.keys()))
            dept = departments[dept_code]
            designation = random.choice(DESIGNATIONS[dept_code])
            email = f"{first.lower()}.{last.lower()}{i}@company.com"

            user, created = User.objects.get_or_create(
                email=email,
                defaults={"username": f"{first.lower()}{last.lower()}{i}", "first_name": first,
                          "last_name": last, "role": User.Role.EMPLOYEE},
            )
            if created:
                user.set_password("Employee@123")
                user.save()

            employee, created = Employee.objects.get_or_create(
                email=email,
                defaults={
                    "user": user, "first_name": first, "last_name": last,
                    "phone": f"+91-90{random.randint(10000000, 99999999)}",
                    "address": "Hyderabad, Telangana, India",
                    "date_of_birth": date(random.randint(1985, 2000), random.randint(1, 12), random.randint(1, 28)),
                    "gender": random.choice(["MALE", "FEMALE"]),
                    "department": dept, "designation": designation,
                    "joining_date": date.today() - timedelta(days=random.randint(30, 1500)),
                    "employment_type": random.choice(["FULL_TIME", "FULL_TIME", "FULL_TIME", "CONTRACT", "INTERN"]),
                    "employment_status": "ACTIVE",
                    "basic_salary": Decimal(random.randint(35000, 150000)),
                    "bank_name": "State Bank of India",
                    "bank_account_number": f"{random.randint(10**10, 10**11-1)}",
                    "bank_ifsc_or_routing": "SBIN0001234",
                },
            )
            employees.append(employee)

        self.stdout.write("Creating attendance records (last 30 days)...")
        today = date.today()
        for employee in employees:
            for day_offset in range(30):
                day = today - timedelta(days=day_offset)
                if day.weekday() >= 5:  # skip weekends
                    continue
                status = random.choices(
                    ["PRESENT", "ABSENT", "HALF_DAY", "LEAVE"], weights=[85, 5, 5, 5], k=1
                )[0]
                Attendance.objects.get_or_create(
                    employee=employee, date=day,
                    defaults={
                        "status": status,
                        "check_in": "09:15:00" if status == "PRESENT" else None,
                        "check_out": "18:20:00" if status == "PRESENT" else None,
                    },
                )

        self.stdout.write("Creating leave requests...")
        leave_types = ["CASUAL", "SICK", "EARNED", "UNPAID"]
        for employee in random.sample(employees, min(8, len(employees))):
            start = today + timedelta(days=random.randint(1, 20))
            end = start + timedelta(days=random.randint(0, 3))
            LeaveRequest.objects.get_or_create(
                employee=employee, start_date=start, end_date=end,
                defaults={
                    "leave_type": random.choice(leave_types),
                    "reason": "Personal reasons",
                    "status": random.choice(["PENDING", "APPROVED", "REJECTED"]),
                },
            )

        self.stdout.write("Creating payroll records (current + previous month)...")
        for employee in employees:
            for month_offset in range(2):
                month = today.month - month_offset
                year = today.year
                if month <= 0:
                    month += 12
                    year -= 1
                payroll, created = Payroll.objects.get_or_create(
                    employee=employee, month=month, year=year,
                    defaults={
                        "basic_salary": employee.basic_salary,
                        "allowances": employee.basic_salary * Decimal("0.15"),
                        "bonus": Decimal(random.choice([0, 0, 1000, 2000])),
                        "overtime_hours": Decimal(random.choice([0, 0, 4, 8])),
                        "overtime_rate_per_hour": Decimal("250.00"),
                        "tax_deduction": employee.basic_salary * Decimal("0.10"),
                        "other_deductions": Decimal("500.00"),
                        "leave_deduction_days": Decimal("0.0"),
                        "status": "PAID" if month_offset == 1 else "GENERATED",
                        "payment_date": today.replace(day=1) - timedelta(days=1) if month_offset == 1 else None,
                    },
                )
                if created:
                    calculate_payroll(payroll)
                    payroll.save()

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully."))
        self.stdout.write(self.style.SUCCESS("  Admin login:    admin@company.com / Admin@12345"))
        self.stdout.write(self.style.SUCCESS("  HR login:       hr@company.com / Hr@12345"))
        self.stdout.write(self.style.SUCCESS("  Employee login: <any generated employee email> / Employee@123"))
