import React from "react";

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="pd-page-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="d-flex gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
