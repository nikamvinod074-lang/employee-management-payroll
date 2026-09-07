import React, { useState } from "react";
import { Link } from "react-router-dom";

import { authService } from "../services/authService";
import { getErrorMessage } from "../services/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [devToken, setDevToken] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const { data } = await authService.forgotPassword(email);
      setMessage(data.detail);
      if (data.token) setDevToken(data.token);
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
          <h3 className="pd-display fw-bold mb-1">Forgot password</h3>
          <p className="text-muted mb-4" style={{ fontSize: 13.5 }}>
            Enter your account email and we&apos;ll help you reset your password.
          </p>

          {error && <div className="alert alert-danger py-2" style={{ fontSize: 13.5 }}>{error}</div>}
          {message && <div className="alert alert-success py-2" style={{ fontSize: 13.5 }}>{message}</div>}
          {devToken && (
            <div className="alert alert-warning py-2" style={{ fontSize: 12.5 }}>
              Dev mode: use this token on the reset page — <span className="pd-mono">{devToken}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-semibold">Email</label>
              <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-pd-primary w-100 py-2" disabled={submitting}>
              {submitting ? "Sending…" : "Send reset link"}
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
