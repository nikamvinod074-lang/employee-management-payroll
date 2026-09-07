import React, { useEffect, useState } from "react";

import ErrorState from "../components/common/ErrorState";
import LoadingState from "../components/common/LoadingState";
import PageHeader from "../components/common/PageHeader";
import { useAuth } from "../context/AuthContext";
import { dashboardService } from "../services/dashboardService";
import { getErrorMessage } from "../services/api";
import AdminDashboard from "./AdminDashboard";
import EmployeeDashboard from "./EmployeeDashboard";

export default function DashboardPage() {
  const { role } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetcher = role === "EMPLOYEE" ? dashboardService.employee : dashboardService.admin;
      const { data: body } = await fetcher();
      setData(body);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={role === "EMPLOYEE" ? "Your attendance, leave, and payroll at a glance." : "Organization-wide HR and payroll overview."}
      />
      {loading && <LoadingState label="Loading dashboard…" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && data && (role === "EMPLOYEE" ? <EmployeeDashboard data={data} /> : <AdminDashboard data={data} />)}
    </div>
  );
}
