import React, { useState } from "react";
import { Modal } from "react-bootstrap";

import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import { IconPlus } from "../components/common/Icons";
import LoadingState from "../components/common/LoadingState";
import PageHeader from "../components/common/PageHeader";
import { useToast } from "../context/ToastContext";
import { usePaginatedList } from "../hooks/usePaginatedList";
import { getErrorMessage } from "../services/api";
import { authService } from "../services/authService";
import { titleCase } from "../utils/format";

const EMPTY_FORM = { email: "", username: "", first_name: "", last_name: "", role: "HR", password: "" };

export default function SettingsPage() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = usePaginatedList(authService.listUsers, { page_size: 50 });

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    try {
      await authService.createUser(form);
      showToast("User account created.", "success");
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
        title="Settings"
        subtitle="Manage login accounts for Admin and HR staff."
        actions={
          <button className="btn btn-pd-accent d-flex align-items-center gap-1" onClick={openCreate}>
            <IconPlus width="16" height="16" /> New User Account
          </button>
        }
      />

      <div className="pd-card">
        {loading && <LoadingState label="Loading users…" />}
        {!loading && error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && data.length === 0 && <EmptyState title="No user accounts" />}
        {!loading && !error && data.length > 0 && (
          <div className="table-responsive">
            <table className="table pd-table mb-0">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr>
              </thead>
              <tbody>
                {data.map((u) => (
                  <tr key={u.id}>
                    <td>{u.full_name || `${u.first_name} ${u.last_name}`}</td>
                    <td className="pd-mono">{u.email}</td>
                    <td><span className="pd-badge pd-badge-info">{titleCase(u.role)}</span></td>
                    <td>
                      <span className={`pd-badge ${u.is_active ? "pd-badge-success" : "pd-badge-neutral"}`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title style={{ fontFamily: "var(--pd-font-display)", fontSize: 17 }}>New User Account</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="row g-3">
              <div className="col-6">
                <label className="form-label small fw-semibold">First Name</label>
                <input className="form-control" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">Last Name</label>
                <input className="form-control" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
              </div>
              <div className="col-12">
                <label className="form-label small fw-semibold">Username</label>
                <input className="form-control" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
                {fieldErrors.username && <div className="text-danger small mt-1">{fieldErrors.username[0]}</div>}
              </div>
              <div className="col-12">
                <label className="form-label small fw-semibold">Email</label>
                <input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                {fieldErrors.email && <div className="text-danger small mt-1">{fieldErrors.email[0]}</div>}
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">Role</label>
                <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="ADMIN">Admin</option>
                  <option value="HR">HR</option>
                  <option value="EMPLOYEE">Employee</option>
                </select>
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">Temporary Password</label>
                <input type="password" className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
                {fieldErrors.password && <div className="text-danger small mt-1">{fieldErrors.password[0]}</div>}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn btn-light border" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-pd-primary" disabled={submitting}>{submitting ? "Creating…" : "Create Account"}</button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
}
