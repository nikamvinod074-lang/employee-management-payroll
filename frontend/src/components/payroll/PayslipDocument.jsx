import React from "react";

import { formatCurrency } from "../../utils/format";

export default function PayslipDocument({ payslip }) {
  if (!payslip) return null;
  return (
    <div className="pd-payslip" id="payslip-print-area">
      <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
        <div>
          <h4 className="pd-display fw-bold mb-0">{payslip.company_name}</h4>
          <div className="text-muted small">{payslip.company_address}</div>
        </div>
        <div className="text-end">
          <div className="pd-stat-label">Payslip For</div>
          <div className="fw-semibold">{payslip.payroll_month}</div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-6">
          <div className="pd-stat-label">Employee</div>
          <div className="fw-semibold">{payslip.employee_name}</div>
          <div className="pd-id text-muted small">{payslip.employee_id}</div>
        </div>
        <div className="col-6 text-end">
          <div className="pd-stat-label">Department / Designation</div>
          <div className="fw-semibold">{payslip.department}</div>
          <div className="text-muted small">{payslip.designation}</div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-6">
          <h6 className="text-uppercase small fw-bold text-muted mb-2">Earnings</h6>
          <PayLine label="Basic Salary" value={payslip.basic_salary} />
          <PayLine label="Allowances" value={payslip.allowances} />
          <PayLine label="Bonus" value={payslip.bonus} />
          <PayLine label="Overtime" value={payslip.overtime_amount} />
          <hr />
          <PayLine label="Gross Salary" value={payslip.gross_salary} bold />
        </div>
        <div className="col-6">
          <h6 className="text-uppercase small fw-bold text-muted mb-2">Deductions</h6>
          <PayLine label="Tax" value={payslip.tax_deduction} />
          <PayLine label="Other Deductions" value={payslip.other_deductions} />
          <PayLine label="Leave Deduction" value={payslip.leave_deduction_amount} />
          <hr />
          <PayLine label="Total Deductions" value={payslip.total_deductions} bold />
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
        <div>
          <div className="pd-stat-label">Payment Status</div>
          <div className="fw-semibold">{payslip.payment_status}{payslip.payment_date ? ` · ${payslip.payment_date}` : ""}</div>
        </div>
        <div className="text-end">
          <div className="pd-stat-label">Net Salary</div>
          <div className="pd-amount fw-bold" style={{ fontSize: 26, color: "var(--pd-ink)" }}>
            {formatCurrency(payslip.net_salary)}
          </div>
        </div>
      </div>
    </div>
  );
}

function PayLine({ label, value, bold }) {
  return (
    <div className={`d-flex justify-content-between mb-1 ${bold ? "fw-bold" : ""}`}>
      <span className={bold ? "" : "text-muted"} style={{ fontSize: 13.5 }}>{label}</span>
      <span className="pd-amount" style={{ fontSize: 13.5 }}>{formatCurrency(value)}</span>
    </div>
  );
}
