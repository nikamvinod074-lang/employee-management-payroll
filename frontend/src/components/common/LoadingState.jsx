import React from "react";

export default function LoadingState({ label = "Loading…" }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5 text-muted">
      <div className="spinner-border text-secondary mb-2" role="status" style={{ width: 28, height: 28 }}>
        <span className="visually-hidden">{label}</span>
      </div>
      <small>{label}</small>
    </div>
  );
}
