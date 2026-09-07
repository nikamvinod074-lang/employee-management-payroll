import React from "react";
import { Modal } from "react-bootstrap";

export default function ConfirmDialog({ show, title = "Are you sure?", message, confirmLabel = "Confirm", variant = "danger", onConfirm, onCancel, loading }) {
  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontFamily: "var(--pd-font-display)", fontSize: 17 }}>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-0 text-muted">{message}</p>
      </Modal.Body>
      <Modal.Footer>
        <button type="button" className="btn btn-light border" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button
          type="button"
          className={`btn btn-${variant}`}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? "Please wait…" : confirmLabel}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
