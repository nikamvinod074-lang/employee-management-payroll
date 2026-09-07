import React, { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { getErrorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("admin@company.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    const dest = location.state?.from?.pathname || "/dashboard";
    return <Navigate to={dest} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err) || "Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pd-auth-shell">
      <div className="pd-auth-side d-none d-lg-flex">
        <div className="d-flex align-items-center gap-2">
          <div className="pd-sidebar-brand-mark">PD</div>
          <div>
            <div className="pd-sidebar-brand-text fs-5">PeopleDesk</div>
            <div className="pd-sidebar-brand-sub">HR &amp; Payroll</div>
          </div>
        </div>
        <div>
          <h1 className="pd-display fw-bold text-white mb-3" style={{ fontSize: 34, lineHeight: 1.15 }}>
            Every payslip,<br />balanced to the rupee.
          </h1>
          <p style={{ color: "#B7C2D8", maxWidth: 420, fontSize: 15 }}>
            Employees, attendance, leave, and payroll — one ledger, one source
            of truth, calculated server-side so the numbers always add up.
          </p>
        </div>
        <div className="pd-mono" style={{ color: "#8393AE", fontSize: 12 }}>
          © {new Date().getFullYear()} PeopleDesk. Built for demonstration purposes.
        </div>
      </div>

      <div className="pd-auth-form-col">
        <div className="pd-auth-card">
          <h3 className="pd-display fw-bold mb-1">Sign in</h3>
          <p className="text-muted mb-4" style={{ fontSize: 13.5 }}>Enter your credentials to access your dashboard.</p>

          {error && <div className="alert alert-danger py-2" style={{ fontSize: 13.5 }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-semibold">Email</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="mb-3">
              <div className="d-flex justify-content-between">
                <label className="form-label small fw-semibold">Password</label>
                <a href="/forgot-password" className="small">Forgot password?</a>
              </div>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-pd-primary w-100 py-2 mt-2" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-4 p-3 rounded" style={{ background: "var(--pd-accent-soft)", fontSize: 12.5 }}>
            <strong>Demo accounts</strong> (after running the seed command):
            <div className="pd-mono mt-1">admin@company.com / Admin@12345</div>
            <div className="pd-mono">hr@company.com / Hr@12345</div>
          </div>
        </div>
      </div>
    </div>
  );
}
