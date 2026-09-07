import React from "react";

export default function EmptyState({ title = "Nothing here yet", message, action }) {
  return (
    <div className="pd-empty-state">
      <h5 className="mb-1" style={{ color: "var(--pd-ink)" }}>{title}</h5>
      {message && <p className="mb-3">{message}</p>}
      {action}
    </div>
  );
}
