import React from "react";

export default function StatCard({ label, value, icon: Icon, iconBg = "var(--pd-accent-soft)", iconColor = "var(--pd-warning)" }) {
  return (
    <div className="pd-stat-card h-100">
      <div className="d-flex align-items-start justify-content-between">
        <div>
          <div className="pd-stat-label">{label}</div>
          <div className="pd-stat-value">{value}</div>
        </div>
        {Icon && (
          <div className="pd-stat-icon" style={{ background: iconBg, color: iconColor }}>
            <Icon width="19" height="19" />
          </div>
        )}
      </div>
    </div>
  );
}
