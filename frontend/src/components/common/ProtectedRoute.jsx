import React from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

/**
 * Guards a route behind authentication, and optionally behind a set of
 * allowed roles. Unauthenticated users are redirected to /login; authorized
 * users hitting a route outside their role are redirected to /dashboard.
 */
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, loading, role } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100">
        <div className="spinner-border text-secondary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
