import React from "react";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center vh-100 text-center px-3">
      <div className="pd-mono text-muted mb-2" style={{ fontSize: 13 }}>ERROR 404</div>
      <h1 className="pd-display fw-bold mb-2">Page not found</h1>
      <p className="text-muted mb-4">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Link to="/dashboard" className="btn btn-pd-primary px-4">Back to dashboard</Link>
    </div>
  );
}
