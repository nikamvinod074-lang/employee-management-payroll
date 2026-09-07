import React from "react";
import { Link } from "react-router-dom";

import StatCard from "../components/common/StatCard";
import StatusBadge from "../components/common/StatusBadge";
import { IconCalendarOff, IconClock, IconReceipt, IconWallet } from "../components/common/Icons";
import { formatCurrency } from "../utils/format";

export default function EmployeeDashboard({ data }) {
  const { employee, today_attendance, attendance_summary, leave_balance, latest_payslip } = data;

  return (
    <div>
      <div className="pd-card mb-4">
        <div className="pd-card-body d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <div className="text-muted small">{employee.employee_id} · {employee.designation}</div>
            <h4 className="pd-display fw-bold mb-0">{employee.full_name}</h4>
            <div className="text-muted small">{employee.department}</div>
          </div>
          <div className="text-end">
            <div className="pd-stat-label mb-1">Today</div>
            <StatusBadge status={today_attendance} />
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <StatCard label="Present (this month)" value={attendance_summary.present} icon={IconClock} iconBg="var(--pd-success-soft)" iconColor="var(--pd-success)" />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard label="Absent (this month)" value={attendance_summary.absent} icon={IconClock} iconBg="var(--pd-danger-soft)" iconColor="var(--pd-danger)" />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard label="Pending Leave" value={leave_balance.pending} icon={IconCalendarOff} iconBg="var(--pd-warning-soft)" iconColor="var(--pd-warning)" />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard label="Leave Days Approved (YTD)" value={leave_balance.approved_this_year} icon={IconCalendarOff} />
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="pd-card h-100">
            <div className="pd-card-header"><h5>Latest Payslip</h5></div>
            <div className="pd-card-body">
              {latest_payslip ? (
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-muted small mb-1">{latest_payslip.month}/{latest_payslip.year}</div>
                    <div className="pd-amount fs-4 fw-semibold">{formatCurrency(latest_payslip.net_salary)}</div>
                    <StatusBadge status={latest_payslip.status} />
                  </div>
                  <Link to="/payslips" className="btn btn-sm btn-pd-primary">
                    <IconReceipt width="15" height="15" className="me-1" /> View payslips
                  </Link>
                </div>
              ) : (
                <p className="text-muted mb-0">No payroll has been generated for you yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="pd-card h-100">
            <div className="pd-card-header"><h5>Quick Links</h5></div>
            <div className="pd-card-body d-flex flex-column gap-2">
              <Link to="/leave" className="btn btn-light border text-start d-flex align-items-center gap-2">
                <IconCalendarOff width="16" height="16" /> Apply for leave
              </Link>
              <Link to="/attendance" className="btn btn-light border text-start d-flex align-items-center gap-2">
                <IconClock width="16" height="16" /> View my attendance
              </Link>
              <Link to="/payslips" className="btn btn-light border text-start d-flex align-items-center gap-2">
                <IconWallet width="16" height="16" /> Salary &amp; payslips
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
