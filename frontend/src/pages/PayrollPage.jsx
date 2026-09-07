import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Modal } from "react-bootstrap";

import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import { IconPlus, IconReceipt } from "../components/common/Icons";
import LoadingState from "../components/common/LoadingState";
import PageHeader from "../components/common/PageHeader";
import Pagination from "../components/common/Pagination";
import StatusBadge from "../components/common/StatusBadge";
import { useToast } from "../context/ToastContext";
import { usePaginatedList } from "../hooks/usePaginatedList";
import { getErrorMessage } from "../services/api";
import { employeeService } from "../services/employeeService";
import { payrollService } from "../services/payrollService";
import { formatCurrency } from "../utils/format";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const EMPTY_FORM = {
  employee: "", month: new Date().getMonth() + 1, year: new Date().getFullYear(),
  basic_salary: "", allowances: "0", bonus: "0", overtime_hours: "0", overtime_rate_per_hour: "0",
  tax_deduction: "0", other_deductions: "0", leave_deduction_days: "0",
};

const STATUS_FLOW = { DRAFT: "GENERATED", GENERATED: "APPROVED", APPROVED: "PAID" };

export default function PayrollPage() {
  const { showToast } = useToast();
  const { data, meta, loading, error, updateParams, setPage, reload } = usePaginatedList(payrollService.list);

  const [employees, setEmployees] = useState([]);
  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(null);

  useEffect(() => {
    employeeService.list({ page_size: 100 }).then(({ data }) => setEmployees(data.results || data));
  }, []);

  useEffect(() => {
    updateParams({ month: monthFilter || undefined, year: yearFilter || undefined, status: statusFilter || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthFilter, yearFilter, statusFilter]);

  const openGenerate = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setShowModal(true);
  };

  const handleEmployeeChange = (employeeId) => {
    const emp = employees.find((e) => e.id === Number(employeeId));
    setForm((prev) => ({ ...prev, employee: employeeId, basic_salary: emp ? emp.basic_salary || "" : prev.basic_salary }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    try {
      await payrollService.create(form);
      showToast("Payroll generated successfully.", "success");
      setShowModal(false);
      reload();
    } catch (err) {
      if (err.response?.data?.errors) setFieldErrors(err.response.data.errors);
      showToast(getErrorMessage(err), "danger");
    } finally {
      setSubmitting(false);
    }
  };

  const advanceStatus = async (payroll) => {
    const nextStatus = STATUS_FLOW[payroll.status];
    if (!nextStatus) return;
    setStatusUpdating(payroll.id);
    try {
      const payload = { status: nextStatus };
      if (nextStatus === "PAID") payload.payment_date = new Date().toISOString().slice(0, 10);
      await payrollService.updateStatus(payroll.id, payload);
      showToast(`Payroll marked as ${nextStatus.toLowerCase()}.`, "success");
      reload();
    } catch (err) {
      showToast(getErrorMessage(err), "danger");
    } finally {
      setStatusUpdating(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Payroll"
        subtitle="Generate and manage monthly payroll records."
        actions={
          <button className="btn btn-pd-accent d-flex align-items-center gap-1" onClick={openGenerate}>
            <IconPlus width="16" height="16" /> Generate Payroll
          </button>
        }
      />

      <div className="d-flex flex-wrap gap-2 mb-3">
        <select className="form-select" style={{ maxWidth: 160 }} value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
          <option value="">All months</option>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <input type="number" className="form-control" style={{ maxWidth: 120 }} placeholder="Year" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} />
        <select className="form-select" style={{ maxWidth: 160 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="GENERATED">Generated</option>
          <option value="APPROVED">Approved</option>
          <option value="PAID">Paid</option>
        </select>
      </div>

      <div className="pd-card">
        {loading && <LoadingState label="Loading payroll…" />}
        {!loading && error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && data.length === 0 && (
          <EmptyState title="No payroll records" message="Generate payroll for an employee to get started." />
        )}
        {!loading && !error && data.length > 0 && (
          <div className="table-responsive">
            <table className="table pd-table mb-0">
              <thead>
                <tr>
                  <th>Employee</th><th>Period</th><th>Gross</th><th>Deductions</th><th>Net Salary</th><th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id}>
                    <td>{p.employee_detail?.full_name}</td>
                    <td className="pd-mono">{MONTHS[p.month - 1]?.slice(0, 3)} {p.year}</td>
                    <td className="pd-amount">{formatCurrency(p.gross_salary)}</td>
                    <td className="pd-amount text-danger">-{formatCurrency(p.total_deductions)}</td>
                    <td className="pd-amount fw-semibold">{formatCurrency(p.net_salary)}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td className="text-end">
                      <Link to="/payslips" className="btn btn-sm btn-light border me-1" title="View payslip">
                        <IconReceipt width="14" height="14" />
                      </Link>
                      {STATUS_FLOW[p.status] && (
                        <button
                          className="btn btn-sm btn-pd-primary"
                          onClick={() => advanceStatus(p)}
                          disabled={statusUpdating === p.id}
                        >
                          {statusUpdating === p.id ? "…" : `Mark ${STATUS_FLOW[p.status]}`}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination meta={meta} onPageChange={setPage} />

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title style={{ fontFamily: "var(--pd-font-display)", fontSize: 17 }}>Generate Payroll</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label small fw-semibold">Employee</label>
                <select className="form-select" value={form.employee} onChange={(e) => handleEmployeeChange(e.target.value)} required>
                  <option value="">Select employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_id})</option>
                  ))}
                </select>
                {fieldErrors.employee && <div className="text-danger small mt-1">{fieldErrors.employee[0]}</div>}
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">Month</label>
                <select className="form-select" value={form.month} onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">Year</label>
                <input type="number" className="form-control" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} required />
              </div>

              <div className="col-6">
                <label className="form-label small fw-semibold">Basic Salary</label>
                <input
                  type="text"
                  className="form-control pd-mono"
                  value={form.basic_salary ? formatCurrency(form.basic_salary) : "Select an employee"}
                  disabled
                  readOnly
                />
                <div className="form-text" style={{ fontSize: 11.5 }}>
                  Auto-filled from the employee&apos;s current record — cannot be edited here.
                </div>
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">Allowances</label>
                <input type="number" step="0.01" className="form-control pd-mono" value={form.allowances} onChange={(e) => setForm({ ...form, allowances: e.target.value })} />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">Bonus</label>
                <input type="number" step="0.01" className="form-control pd-mono" value={form.bonus} onChange={(e) => setForm({ ...form, bonus: e.target.value })} />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">Leave Deduction (days)</label>
                <input type="number" step="0.5" className="form-control pd-mono" value={form.leave_deduction_days} onChange={(e) => setForm({ ...form, leave_deduction_days: e.target.value })} />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">Overtime Hours</label>
                <input type="number" step="0.5" className="form-control pd-mono" value={form.overtime_hours} onChange={(e) => setForm({ ...form, overtime_hours: e.target.value })} />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">Overtime Rate / hr</label>
                <input type="number" step="0.01" className="form-control pd-mono" value={form.overtime_rate_per_hour} onChange={(e) => setForm({ ...form, overtime_rate_per_hour: e.target.value })} />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">Tax Deduction</label>
                <input type="number" step="0.01" className="form-control pd-mono" value={form.tax_deduction} onChange={(e) => setForm({ ...form, tax_deduction: e.target.value })} />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">Other Deductions</label>
                <input type="number" step="0.01" className="form-control pd-mono" value={form.other_deductions} onChange={(e) => setForm({ ...form, other_deductions: e.target.value })} />
              </div>
            </div>
            <div className="alert alert-light border mt-3 mb-0" style={{ fontSize: 12.5 }}>
              Gross, deductions, and net salary are calculated automatically on the server — they can&apos;t be entered directly.
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn btn-light border" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-pd-primary" disabled={submitting}>{submitting ? "Generating…" : "Generate"}</button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
}
