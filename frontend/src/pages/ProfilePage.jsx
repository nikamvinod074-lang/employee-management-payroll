import React, { useEffect, useState } from "react";

import ErrorState from "../components/common/ErrorState";
import LoadingState from "../components/common/LoadingState";
import PageHeader from "../components/common/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getErrorMessage } from "../services/api";
import { authService } from "../services/authService";
import { employeeService } from "../services/employeeService";
import { formatCurrency, formatDate, initials, titleCase } from "../utils/format";

export default function ProfilePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isEmployee = user?.role === "EMPLOYEE";

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(isEmployee);
  const [error, setError] = useState(null);
  const [editForm, setEditForm] = useState({ phone: "", address: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwForm, setPwForm] = useState({ old_password: "", new_password: "", confirm_password: "" });
  const [pwError, setPwError] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);

  useEffect(() => {
    if (!isEmployee) {
      setLoading(false);
      return;
    }
    employeeService
      .list({ page_size: 1 })
      .then(({ data }) => {
        const emp = (data.results || data)[0];
        setEmployee(emp);
        if (emp) setEditForm({ phone: emp.phone, address: emp.address });
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [isEmployee]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await employeeService.update(employee.id, editForm);
      showToast("Profile updated.", "success");
    } catch (err) {
      showToast(getErrorMessage(err), "danger");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError("");
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwError("New password and confirmation do not match.");
      return;
    }
    setPwSubmitting(true);
    try {
      await authService.changePassword({ old_password: pwForm.old_password, new_password: pwForm.new_password });
      showToast("Password changed successfully.", "success");
      setPwForm({ old_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setPwError(getErrorMessage(err));
    } finally {
      setPwSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Profile" subtitle="Manage your account details and password." />

      <div className="row g-3">
        <div className="col-12 col-lg-4">
          <div className="pd-card">
            <div className="pd-card-body text-center">
              <div className="pd-avatar mx-auto mb-3" style={{ width: 72, height: 72, fontSize: 24 }}>
                {initials(user?.first_name || "U", user?.last_name || "")}
              </div>
              <h5 className="mb-0">{user?.full_name || user?.email}</h5>
              <div className="text-muted small mb-2">{user?.email}</div>
              <span className="pd-badge pd-badge-info">{titleCase(user?.role || "")}</span>

              {employee && (
                <>
                  <hr />
                  <div className="text-start">
                    <SmallRow label="Employee ID" value={<span className="pd-id">{employee.employee_id}</span>} />
                    <SmallRow label="Department" value={employee.department_detail?.name} />
                    <SmallRow label="Designation" value={employee.designation} />
                    <SmallRow label="Joined" value={formatDate(employee.joining_date)} />
                    <SmallRow label="Basic Salary" value={<span className="pd-amount">{formatCurrency(employee.basic_salary)}</span>} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-8">
          {isEmployee && (
            <div className="pd-card mb-3">
              <div className="pd-card-header"><h5>Edit Contact Details</h5></div>
              <div className="pd-card-body">
                {loading && <LoadingState label="Loading…" />}
                {!loading && error && <ErrorState message={error} />}
                {!loading && !error && employee && (
                  <form onSubmit={handleProfileSave}>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Phone</label>
                      <input className="form-control" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Address</label>
                      <textarea className="form-control" rows={2} value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                    </div>
                    <p className="text-muted small">
                      Salary, department, and employment details can only be changed by Admin or HR.
                    </p>
                    <button type="submit" className="btn btn-pd-primary" disabled={savingProfile}>
                      {savingProfile ? "Saving…" : "Save Changes"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          <div className="pd-card">
            <div className="pd-card-header"><h5>Change Password</h5></div>
            <div className="pd-card-body">
              {pwError && <div className="alert alert-danger py-2" style={{ fontSize: 13.5 }}>{pwError}</div>}
              <form onSubmit={handlePasswordChange}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Current Password</label>
                  <input type="password" className="form-control" value={pwForm.old_password} onChange={(e) => setPwForm({ ...pwForm, old_password: e.target.value })} required />
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-semibold">New Password</label>
                    <input type="password" className="form-control" value={pwForm.new_password} onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} required minLength={8} />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Confirm New Password</label>
                    <input type="password" className="form-control" value={pwForm.confirm_password} onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })} required minLength={8} />
                  </div>
                </div>
                <button type="submit" className="btn btn-pd-primary" disabled={pwSubmitting}>
                  {pwSubmitting ? "Updating…" : "Update Password"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SmallRow({ label, value }) {
  return (
    <div className="mb-2">
      <div className="text-muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 13.5 }}>{value}</div>
    </div>
  );
}
