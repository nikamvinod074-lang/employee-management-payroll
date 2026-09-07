import React, { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";

import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import { IconCheck, IconPlus, IconX } from "../components/common/Icons";
import LoadingState from "../components/common/LoadingState";
import PageHeader from "../components/common/PageHeader";
import Pagination from "../components/common/Pagination";
import StatusBadge from "../components/common/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { usePaginatedList } from "../hooks/usePaginatedList";
import { getErrorMessage } from "../services/api";
import { employeeService } from "../services/employeeService";
import { leaveService } from "../services/leaveService";
import { formatDate, formatDateTime } from "../utils/format";

const EMPTY_FORM = { employee: "", leave_type: "CASUAL", start_date: "", end_date: "", reason: "" };

export default function LeavePage() {
  const { role } = useAuth();
  const { showToast } = useToast();
  const isManager = role === "ADMIN" || role === "HR";

  const { data, meta, loading, error, updateParams, setPage, reload } = usePaginatedList(leaveService.list);
  const [statusFilter, setStatusFilter] = useState("");
  const [employees, setEmployees] = useState([]);

  const [showApply, setShowApply] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewDecision, setReviewDecision] = useState("APPROVED");
  const [reviewComments, setReviewComments] = useState("");
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    if (isManager) {
      employeeService.list({ page_size: 100 }).then(({ data }) => setEmployees(data.results || data));
    }
  }, [isManager]);

  useEffect(() => {
    updateParams({ status: statusFilter || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const openApply = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setShowApply(true);
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    try {
      const payload = isManager ? form : { leave_type: form.leave_type, start_date: form.start_date, end_date: form.end_date, reason: form.reason };
      await leaveService.create(payload);
      showToast("Leave request submitted.", "success");
      setShowApply(false);
      reload();
    } catch (err) {
      if (err.response?.data?.errors) setFieldErrors(err.response.data.errors);
      showToast(getErrorMessage(err), "danger");
    } finally {
      setSubmitting(false);
    }
  };

  const openReview = (leave, decision) => {
    setReviewTarget(leave);
    setReviewDecision(decision);
    setReviewComments("");
  };

  const handleReview = async () => {
    setReviewing(true);
    try {
      await leaveService.review(reviewTarget.id, { status: reviewDecision, review_comments: reviewComments });
      showToast(`Leave request ${reviewDecision.toLowerCase()}.`, "success");
      setReviewTarget(null);
      reload();
    } catch (err) {
      showToast(getErrorMessage(err), "danger");
    } finally {
      setReviewing(false);
    }
  };

  const handleCancel = async (leave) => {
    try {
      await leaveService.remove(leave.id);
      showToast("Leave request cancelled.", "success");
      reload();
    } catch (err) {
      showToast(getErrorMessage(err), "danger");
    }
  };

  return (
    <div>
      <PageHeader
        title="Leave Management"
        subtitle={isManager ? "Review and manage employee leave requests." : "Apply for leave and track your requests."}
        actions={
          <button className="btn btn-pd-accent d-flex align-items-center gap-1" onClick={openApply}>
            <IconPlus width="16" height="16" /> Apply for Leave
          </button>
        }
      />

      <div className="d-flex flex-wrap gap-2 mb-3">
        <select className="form-select" style={{ maxWidth: 180 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="pd-card">
        {loading && <LoadingState label="Loading leave requests…" />}
        {!loading && error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && data.length === 0 && (
          <EmptyState title="No leave requests" message="Apply for leave using the button above." />
        )}
        {!loading && !error && data.length > 0 && (
          <div className="table-responsive">
            <table className="table pd-table mb-0">
              <thead>
                <tr>
                  {isManager && <th>Employee</th>}
                  <th>Type</th><th>Dates</th><th>Days</th><th>Reason</th><th>Status</th><th>Applied</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((leave) => (
                  <tr key={leave.id}>
                    {isManager && <td>{leave.employee_detail?.full_name}</td>}
                    <td>{leave.leave_type}</td>
                    <td className="pd-mono text-muted">{formatDate(leave.start_date)} → {formatDate(leave.end_date)}</td>
                    <td className="pd-mono">{leave.number_of_days}</td>
                    <td style={{ maxWidth: 200 }} className="text-truncate">{leave.reason}</td>
                    <td><StatusBadge status={leave.status} /></td>
                    <td className="pd-mono text-muted" style={{ fontSize: 11.5 }}>{formatDateTime(leave.applied_date)}</td>
                    <td className="text-end">
                      {isManager && leave.status === "PENDING" && (
                        <>
                          <button className="btn btn-sm btn-outline-success me-1" onClick={() => openReview(leave, "APPROVED")} title="Approve">
                            <IconCheck width="14" height="14" />
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => openReview(leave, "REJECTED")} title="Reject">
                            <IconX width="14" height="14" />
                          </button>
                        </>
                      )}
                      {!isManager && leave.status === "PENDING" && (
                        <button className="btn btn-sm btn-light border" onClick={() => handleCancel(leave)}>Cancel</button>
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

      {/* Apply for leave modal */}
      <Modal show={showApply} onHide={() => setShowApply(false)} centered>
        <form onSubmit={handleApply}>
          <Modal.Header closeButton>
            <Modal.Title style={{ fontFamily: "var(--pd-font-display)", fontSize: 17 }}>Apply for Leave</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {isManager && (
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
            )}
            <div className="mb-3">
              <label className="form-label small fw-semibold">Leave Type</label>
              <select className="form-select" value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}>
                <option value="CASUAL">Casual Leave</option>
                <option value="SICK">Sick Leave</option>
                <option value="EARNED">Earned Leave</option>
                <option value="UNPAID">Unpaid Leave</option>
              </select>
            </div>
            <div className="row g-3 mb-3">
              <div className="col-6">
                <label className="form-label small fw-semibold">Start Date</label>
                <input type="date" className="form-control" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">End Date</label>
                <input type="date" className="form-control" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
                {fieldErrors.end_date && <div className="text-danger small mt-1">{fieldErrors.end_date[0]}</div>}
              </div>
            </div>
            <div className="mb-1">
              <label className="form-label small fw-semibold">Reason</label>
              <textarea className="form-control" rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required />
            </div>
            {fieldErrors.non_field_errors && <div className="text-danger small mt-1">{fieldErrors.non_field_errors[0]}</div>}
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn btn-light border" onClick={() => setShowApply(false)}>Cancel</button>
            <button type="submit" className="btn btn-pd-primary" disabled={submitting}>{submitting ? "Submitting…" : "Submit Request"}</button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Review modal */}
      <Modal show={!!reviewTarget} onHide={() => setReviewTarget(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontFamily: "var(--pd-font-display)", fontSize: 17 }}>
            {reviewDecision === "APPROVED" ? "Approve" : "Reject"} Leave Request
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-3">
            {reviewTarget?.employee_detail?.full_name} — {reviewTarget?.leave_type} ({formatDate(reviewTarget?.start_date)} to {formatDate(reviewTarget?.end_date)})
          </p>
          <label className="form-label small fw-semibold">Comments (optional)</label>
          <textarea className="form-control" rows={3} value={reviewComments} onChange={(e) => setReviewComments(e.target.value)} />
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-light border" onClick={() => setReviewTarget(null)}>Cancel</button>
          <button
            type="button"
            className={`btn ${reviewDecision === "APPROVED" ? "btn-success" : "btn-danger"}`}
            onClick={handleReview}
            disabled={reviewing}
          >
            {reviewing ? "Saving…" : reviewDecision === "APPROVED" ? "Approve" : "Reject"}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
