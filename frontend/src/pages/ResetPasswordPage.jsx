import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { authService } from "../services/authService";
import { getErrorMessage } from "../services/api";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await authService.resetPassword({ token, new_password: newPassword });
      navigate("/login");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pd-auth-shell">
      <div className="pd-auth-form-col w-100">
        <div className="pd-auth-card">
          <h3 className="pd-display fw-bold mb-1">Reset password</h3>
          <p className="text-muted mb-4" style={{ fontSize: 13.5 }}>Paste the reset token you received, then choose a new password.</p>

          {error && <div className="alert alert-danger py-2" style={{ fontSize: 13.5 }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-semibold">Reset token</label>
              <input className="form-control pd-mono" value={token} onChange={(e) => setToken(e.target.value)} required />
            </div>
            <div className="mb-3">
              <label className="form-label small fw-semibold">New password</label>
              <input type="password" className="form-control" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
            </div>
            <button type="submit" className="btn btn-pd-primary w-100 py-2" disabled={submitting}>
              {submitting ? "Resetting…" : "Reset password"}
            </button>
          </form>

          <div className="text-center mt-3">
            <Link to="/login" className="small">Back to sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
