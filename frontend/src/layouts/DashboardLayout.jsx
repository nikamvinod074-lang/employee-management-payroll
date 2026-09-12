import React, { useState } from "react"; 
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import {
  IconBell,
  IconBuilding,
  IconCalendarOff,
  IconClock,
  IconGrid,
  IconLogout,
  IconMenu,
  IconReceipt,
  IconSettings,
  IconUser,
  IconUsers,
  IconWallet,
} from "../components/common/Icons";
import { useAuth } from "../context/AuthContext";
import { initials, titleCase } from "../utils/format";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: IconGrid, roles: ["ADMIN", "HR", "EMPLOYEE"] },
  { to: "/employees", label: "Employees", icon: IconUsers, roles: ["ADMIN", "HR", "EMPLOYEE"] },
  { to: "/departments", label: "Departments", icon: IconBuilding, roles: ["ADMIN", "HR"] },
  { to: "/attendance", label: "Attendance", icon: IconClock, roles: ["ADMIN", "HR", "EMPLOYEE"] },
  { to: "/leave", label: "Leave", icon: IconCalendarOff, roles: ["ADMIN", "HR", "EMPLOYEE"] },
  { to: "/payroll", label: "Payroll", icon: IconWallet, roles: ["ADMIN", "HR"] },
  { to: "/payslips", label: "Payslips", icon: IconReceipt, roles: ["ADMIN", "HR", "EMPLOYEE"] },
];

export default function DashboardLayout() {
  const { user, logout, role } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <div className="pd-app-shell">
      <div className={`pd-sidebar-backdrop ${mobileOpen ? "open" : ""}`} onClick={() => setMobileOpen(false)} />
      <aside className={`pd-sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="pd-sidebar-brand">
          <div className="pd-sidebar-brand-mark">PD</div>
          <div>
            <div className="pd-sidebar-brand-text">PeopleDesk</div>
            <div className="pd-sidebar-brand-sub">HR &amp; Payroll</div>
          </div>
        </div>

        <nav className="pd-nav">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `pd-nav-link ${isActive ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon />
              {label}
            </NavLink>
          ))}

          <div className="pd-nav-section-label">Account</div>
          <NavLink to="/profile" className={({ isActive }) => `pd-nav-link ${isActive ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
            <IconUser /> Profile
          </NavLink>
          {role === "ADMIN" && (
            <NavLink to="/settings" className={({ isActive }) => `pd-nav-link ${isActive ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
              <IconSettings /> Settings
            </NavLink>
          )}
          <button type="button" className="pd-nav-link border-0 bg-transparent w-100 text-start" onClick={handleLogout}>
            <IconLogout /> Log out
          </button>
        </nav>

        <div className="pd-sidebar-footer">
          Signed in as<br />
          <strong style={{ color: "#C7D0E0" }}>{user?.full_name || user?.email}</strong>
        </div>
      </aside>

      <div className="pd-main">
        <header className="pd-topbar">
          <div className="d-flex align-items-center gap-3">
            <button
              type="button"
              className="btn btn-sm btn-light d-lg-none border"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <IconMenu />
            </button>
            <span className="pd-topbar-title d-none d-sm-inline">Welcome back{user?.first_name ? `, ${user.first_name}` : ""}</span>
          </div>

          <div className="d-flex align-items-center gap-3">
            <button type="button" className="btn btn-sm btn-light border position-relative" aria-label="Notifications">
              <IconBell width="16" height="16" />
            </button>
            <div className="d-flex align-items-center gap-2">
              <div className="pd-avatar">{initials(user?.first_name || "U", user?.last_name || "")}</div>
              <div className="d-none d-md-block">
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--pd-ink)", lineHeight: 1.1 }}>
                  {user?.full_name || user?.email}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--pd-text-muted)" }}>{titleCase(role || "")}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="pd-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
