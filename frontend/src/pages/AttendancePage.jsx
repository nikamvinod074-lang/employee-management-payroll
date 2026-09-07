import React, { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";

import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import { IconPlus } from "../components/common/Icons";
import LoadingState from "../components/common/LoadingState";
import PageHeader from "../components/common/PageHeader";
import Pagination from "../components/common/Pagination";
import StatusBadge from "../components/common/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { usePaginatedList } from "../hooks/usePaginatedList";
import { getErrorMessage } from "../services/api";
import { attendanceService } from "../services/attendanceService";
import { employeeService } from "../services/employeeService";
import { formatDate } from "../utils/format";

const EMPTY_FORM = { employee: "", date: "", status: "PRESENT", check_in: "", check_out: "", notes: "" };

export default function AttendancePage() {
  const { role } = useAuth();
  const { showToast } = useToast();
  const isManager = role === "ADMIN" || role === "HR";

  const { data, meta, loading, error, updateParams, setPage, reload } = usePaginatedList(attendanceService.list);

  const [employees, setEmployees] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isManager) {
      employeeService.list({ page_size: 100 }).then(({ data }) => setEmployees(data.results || data));
    }
  }, [isManager]);

  useEffect(() => {
    updateParams({ status: statusFilter || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const openMark = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    try {
      const payload = { ...form };
      if (!payload.check_in) delete payload.check_in;
      if (!payload.check_out) delete payload.check_out;
      await attendanceService.create(payload);
      showToast("Attendance recorded.", "success");
      setShowModal(false);
      reload();
    } catch (err) {
      if (err.response?.data?.errors) setFieldErrors(err.response.data.errors);
      showToast(getErrorMessage(err), "danger");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle={isManager ? "Track and manage daily attendance across the organization." : "Your attendance history."}
        actions={
          isManager && (
            <button className="btn btn-pd-accent d-flex align-items-center gap-1" onClick={openMark}>
              <IconPlus width="16" height="16" /> Mark Attendance
            </button>
          )
        }
      />

      <div className="d-flex flex-wrap gap-2 mb-3">
        <select className="form-select" style={{ maxWidth: 180 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="PRESENT">Present</option>
          <option value="ABSENT">Absent</option>
          <option value="HALF_DAY">Half Day</option>
          <option value="LEAVE">Leave</option>
        </select>
      </div>

      <div className="pd-card">
        {loading && <LoadingState label="Loading attendance…" />}
        {!loading && error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && data.length === 0 && (
          <EmptyState title="No attendance records" message="Records will appear here once attendance is marked." />
        )}
        {!loading && !error && data.length > 0 && (
          <div className="table-responsive">
            <table className="table pd-table mb-0">
              <thead>
                <tr>
                  {isManager && <th>Employee</th>}
                  <th>Date</th><th>Check-in</th><th>Check-out</th><th>Status</th><th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.map((a) => (
                  <tr key={a.id}>
                    {isManager && <td>{a.employee_detail?.full_name}</td>}
                    <td className="pd-mono">{formatDate(a.date)}</td>
                    <td className="pd-mono text-muted">{a.check_in || "—"}</td>
                    <td className="pd-mono text-muted">{a.check_out || "—"}</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="text-muted">{a.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination meta={meta} onPageChange={setPage} />

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title style={{ fontFamily: "var(--pd-font-display)", fontSize: 17 }}>Mark Attendance</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label small fw-semibold">Employee</label>
              <select className="form-select" value={form.employee} onChange={(e) => setForm({ ...form, employee: e.target.value })} required>
                <option value="">Select employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_id})</option>
                ))}
              </select>
              {fieldErrors.employee && <div className="text-danger small mt-1">{fieldErrors.employee[0]}</div>}
            </div>
            <div className="row g-3">
              <div className="col-6">
                <label className="form-label small fw-semibold">Date</label>
                <input type="date" className="form-control" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                {fieldErrors.date && <div className="text-danger small mt-1">{fieldErrors.date[0]}</div>}
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">Status</label>
                <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="LEAVE">Leave</option>
                </select>
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">Check-in</label>
                <input type="time" className="form-control" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">Check-out</label>
                <input type="time" className="form-control" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} />
                {fieldErrors.check_out && <div className="text-danger small mt-1">{fieldErrors.check_out[0]}</div>}
              </div>
              <div className="col-12">
                <label className="form-label small fw-semibold">Notes</label>
                <input className="form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn btn-light border" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-pd-primary" disabled={submitting}>{submitting ? "Saving…" : "Save"}</button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
}
