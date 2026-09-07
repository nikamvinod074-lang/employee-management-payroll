"""
Payroll business logic.

This is the single source of truth for how gross/net salary is calculated.
The API never accepts a client-supplied net salary - it is always derived
here from the underlying components, per the project requirement that the
final figure cannot simply be typed in by a user.
"""
from decimal import ROUND_HALF_UP, Decimal

TWO_PLACES = Decimal("0.01")


def _q(value: Decimal) -> Decimal:
    return Decimal(value).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def calculate_payroll(payroll) -> None:
    """
    Populates the computed fields on an (unsaved-or-saved) Payroll instance
    based on its editable inputs. Does not call .save() - the caller decides
    when to persist.
    """
    basic = Decimal(payroll.basic_salary or 0)
    allowances = Decimal(payroll.allowances or 0)
    bonus = Decimal(payroll.bonus or 0)
    overtime_hours = Decimal(payroll.overtime_hours or 0)
    overtime_rate = Decimal(payroll.overtime_rate_per_hour or 0)
    tax = Decimal(payroll.tax_deduction or 0)
    other_deductions = Decimal(payroll.other_deductions or 0)
    leave_days = Decimal(payroll.leave_deduction_days or 0)

    overtime_amount = _q(overtime_hours * overtime_rate)

    # Per-day salary derived from a standard 30-day month, used to compute
    # unpaid-leave deductions consistently.
    per_day_salary = (basic / Decimal(30)) if basic else Decimal(0)
    leave_deduction_amount = _q(per_day_salary * leave_days)

    gross_salary = _q(basic + allowances + bonus + overtime_amount)
    total_deductions = _q(tax + other_deductions + leave_deduction_amount)
    net_salary = _q(gross_salary - total_deductions)

    payroll.overtime_amount = overtime_amount
    payroll.leave_deduction_amount = leave_deduction_amount
    payroll.gross_salary = gross_salary
    payroll.total_deductions = total_deductions
    payroll.net_salary = net_salary if net_salary > 0 else Decimal("0.00")
