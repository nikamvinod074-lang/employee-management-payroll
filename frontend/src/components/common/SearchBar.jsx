import React from "react";

import { IconSearch } from "./Icons";

export default function SearchBar({ value, onChange, placeholder = "Search…" }) {
  return (
    <div className="position-relative" style={{ maxWidth: 320 }}>
      <span className="position-absolute top-50 translate-middle-y ms-3 text-muted">
        <IconSearch width="15" height="15" />
      </span>
      <input
        type="search"
        className="form-control ps-5"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
