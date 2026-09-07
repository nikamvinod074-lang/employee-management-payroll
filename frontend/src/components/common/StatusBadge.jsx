import React from "react";

const MAP = {
  ACTIVE: "success", PRESENT: "success", APPROVED: "success", PAID: "success", GENERATED: "info",
  INACTIVE: "neutral", HALF_DAY: "warning", PENDING: "warning", DRAFT: "neutral", APPROVED_: "success",
  RESIGNED: "neutral", TERMINATED: "danger", ABSENT: "danger", REJECTED: "danger", CANCELLED: "neutral",
  LEAVE: "info",
};

export default function StatusBadge({ status }) {
  const variant = MAP[status] || "neutral";
  const label = status ? status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "—";
  return <span className={`pd-badge pd-badge-${variant}`}>{label}</span>;
}
