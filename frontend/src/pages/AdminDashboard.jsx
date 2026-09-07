import React from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";

import { CHART_COLORS, baseOptions } from "../components/charts/chartSetup";
import "../components/charts/chartSetup";
import StatCard from "../components/common/StatCard";
import StatusBadge from "../components/common/StatusBadge";
import { IconBuilding, IconCalendarOff, IconUsers, IconWallet } from "../components/common/Icons";
import { formatCurrency, formatDateTime } from "../utils/format";

const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function AdminDashboard({ data }) {
  const deptLabels = data.charts.employees_by_department.map((d) => d.name);
  const deptCounts = data.charts.employees_by_department.map((d) => d.count);

  const statusLabels = data.charts.employees_by_status.map((d) => d.employment_status);
  const statusCounts = data.charts.employees_by_status.map((d) => d.count);

  const payrollTrend = data.charts.monthly_payroll_trend;

  return (
    <div>
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <StatCard label="Total Employees" value={data.total_employees} icon={IconUsers} />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard label="Active Employees" value={data.active_employees} icon={IconUsers} iconBg="var(--pd-success-soft)" iconColor="var(--pd-success)" />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard label="Departments" value={data.total_departments} icon={IconBuilding} iconBg="var(--pd-info-soft)" iconColor="var(--pd-info)" />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard label="Pending Leave Requests" value={data.pending_leave_requests} icon={IconCalendarOff} iconBg="var(--pd-warning-soft)" iconColor="var(--pd-warning)" />
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-4">
          <StatCard
            label="This Month's Payroll"
            value={<span className="pd-amount">{formatCurrency(data.monthly_payroll_total)}</span>}
            icon={IconWallet}
          />
        </div>
        <div className="col-6 col-lg-4">
          <div className="pd-card pd-card-body h-100">
            <div className="pd-stat-label mb-2">Today&apos;s Attendance</div>
            <div className="d-flex gap-3 flex-wrap">
              <AttendancePill label="Present" value={data.attendance_overview.present} variant="success" />
              <AttendancePill label="Absent" value={data.attendance_overview.absent} variant="danger" />
              <AttendancePill label="Half Day" value={data.attendance_overview.half_day} variant="warning" />
              <AttendancePill label="Leave" value={data.attendance_overview.leave} variant="info" />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-4">
          <div className="pd-card h-100">
            <div className="pd-card-header"><h5>Employees by Department</h5></div>
            <div className="pd-card-body" style={{ height: 260 }}>
              {deptLabels.length ? (
                <Doughnut
                  data={{
                    labels: deptLabels,
                    datasets: [{ data: deptCounts, backgroundColor: CHART_COLORS, borderWidth: 0 }],
                  }}
                  options={{ ...baseOptions, scales: undefined, cutout: "62%" }}
                />
              ) : (
                <p className="text-muted small">No department data yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="pd-card h-100">
            <div className="pd-card-header"><h5>Employee Status</h5></div>
            <div className="pd-card-body" style={{ height: 260 }}>
              {statusLabels.length ? (
                <Bar
                  data={{
                    labels: statusLabels,
                    datasets: [{ label: "Employees", data: statusCounts, backgroundColor: "#C9972E", borderRadius: 5, maxBarThickness: 34 }],
                  }}
                  options={{ ...baseOptions, plugins: { ...baseOptions.plugins, legend: { display: false } } }}
                />
              ) : (
                <p className="text-muted small">No employee data yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="pd-card h-100">
            <div className="pd-card-header"><h5>Monthly Payroll Trend</h5></div>
            <div className="pd-card-body" style={{ height: 260 }}>
              <Line
                data={{
                  labels: payrollTrend.map((p) => `${MONTH_NAMES[p.month]} '${String(p.year).slice(2)}`),
                  datasets: [
                    {
                      label: "Net payroll",
                      data: payrollTrend.map((p) => p.total),
                      borderColor: "#12203A",
                      backgroundColor: "rgba(18,32,58,0.08)",
                      fill: true,
                      tension: 0.35,
                      pointRadius: 3,
                    },
                  ],
                }}
                options={{ ...baseOptions, plugins: { ...baseOptions.plugins, legend: { display: false } } }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="pd-card h-100">
            <div className="pd-card-header"><h5>Recently Added Employees</h5></div>
            <div className="table-responsive">
              <table className="table pd-table mb-0">
                <thead><tr><th>Employee</th><th>Department</th><th>Added</th></tr></thead>
                <tbody>
                  {data.recent_employees.length === 0 && (
                    <tr><td colSpan={3} className="text-center text-muted py-4">No employees yet.</td></tr>
                  )}
                  {data.recent_employees.map((e, i) => (
                    <tr key={i}>
                      <td>{e.first_name} {e.last_name}</td>
                      <td>{e["department__name"]}</td>
                      <td className="pd-mono text-muted">{formatDateTime(e.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="pd-card h-100">
            <div className="pd-card-header"><h5>Recent Leave Requests</h5></div>
            <div className="table-responsive">
              <table className="table pd-table mb-0">
                <thead><tr><th>Employee</th><th>Type</th><th>Status</th></tr></thead>
                <tbody>
                  {data.recent_leave_requests.length === 0 && (
                    <tr><td colSpan={3} className="text-center text-muted py-4">No leave requests yet.</td></tr>
                  )}
                  {data.recent_leave_requests.map((l, i) => (
                    <tr key={i}>
                      <td>{l["employee__first_name"]} {l["employee__last_name"]}</td>
                      <td>{l.leave_type}</td>
                      <td><StatusBadge status={l.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AttendancePill({ label, value, variant }) {
  return (
    <div>
      <div className={`pd-badge pd-badge-${variant} mb-1`}>{label}</div>
      <div className="pd-mono fw-semibold" style={{ fontSize: 18 }}>{value}</div>
    </div>
  );
}
