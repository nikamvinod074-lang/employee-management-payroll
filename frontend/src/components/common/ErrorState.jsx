import React from "react";

export default function ErrorState({ message = "Something went wrong.", onRetry }) {
  return (
    <div className="pd-empty-state">
      <h5 className="mb-1" style={{ color: "var(--pd-danger)" }}>Couldn&apos;t load this</h5>
      <p className="mb-3">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
