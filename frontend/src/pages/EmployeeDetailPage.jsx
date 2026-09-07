import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import ErrorState from "../components/common/ErrorState";
import { IconEdit } from "../components/common/Icons";
import LoadingState from "../components/common/LoadingState";
import PageHeader from "../components/common/PageHeader";
import StatusBadge from "../components/common/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../services/api";
import { employeeService } from "../services/employeeService";
import { formatCurrency, formatDate, initials, titleCase } from "../utils/format";

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const { role } = useAuth();
  const isManager = role === "ADMIN" || role === "HR";
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await employeeService.get(id);
      setEmployee(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <LoadingState label="Loading employee…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!employee) return null;

  return (
    <div>
      <PageHeader
        title={employee.full_name}
        subtitle={`${employee.employee_id} · ${employee.designation}`}
        actions={
          isManager && (
            <Link to={`/employees/${id}/edit`} className="btn btn-pd-primary d-flex align-items-center gap-1">
              <IconEdit width="15" height="15" /> Edit
            </Link>
          )
        }
      />

      <div className="row g-3">
        <div className="col-12 col-lg-4">
          <div className="pd-card">
            <div className="pd-card-body text-center">
              <div className="pd-avatar mx-auto mb-3" style={{ width: 72, height: 72, fontSize: 24 }}>
                {initials(employee.first_name, employee.last_name)}
              </div>
              <h5 className="mb-0">{employee.full_name}</h5>
              <div className="text-muted small mb-2">{employee.designation}</div>
              <StatusBadge status={employee.employment_status} />

              <hr />
              <div className="text-start">
                <DetailRow label="Email" value={employee.email} />
                <DetailRow label="Phone" value={employee.phone} />
                <DetailRow label="Address" value={employee.address || "—"} />
                <DetailRow label="Date of Birth" value={formatDate(employee.date_of_birth)} />
                <DetailRow label="Gender" value={titleCase(employee.gender)} />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-8">
          <div className="pd-card mb-3">
            <div className="pd-card-header"><h5>Employment Details</h5></div>
            <div className="pd-card-body">
              <div className="row">
                <div className="col-sm-6"><DetailRow label="Employee ID" value={<span className="pd-id">{employee.employee_id}</span>} /></div>
                <div className="col-sm-6"><DetailRow label="Department" value={employee.department_detail?.name} /></div>
                <div className="col-sm-6"><DetailRow label="Designation" value={employee.designation} /></div>
                <div className="col-sm-6"><DetailRow label="Employment Type" value={titleCase(employee.employment_type)} /></div>
                <div className="col-sm-6"><DetailRow label="Joining Date" value={formatDate(employee.joining_date)} /></div>
                <div className="col-sm-6"><DetailRow label="Status" value={<StatusBadge status={employee.employment_status} />} /></div>
              </div>
            </div>
          </div>

          {isManager && (
            <div className="pd-card">
              <div className="pd-card-header"><h5>Compensation &amp; Banking</h5></div>
              <div className="pd-card-body">
                <div className="row">
                  <div className="col-sm-6">
                    <DetailRow label="Basic Salary" value={<span className="pd-amount fw-semibold">{formatCurrency(employee.basic_salary)}</span>} />
                  </div>
                  <div className="col-sm-6"><DetailRow label="Bank Name" value={employee.bank_name || "—"} /></div>
                  <div className="col-sm-6"><DetailRow label="Account Number" value={employee.bank_account_number ? <span className="pd-mono">••••{employee.bank_account_number.slice(-4)}</span> : "—"} /></div>
                  <div className="col-sm-6"><DetailRow label="IFSC / Routing" value={employee.bank_ifsc_or_routing || "—"} /></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="mb-2">
      <div className="text-muted" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 14 }}>{value}</div>
    </div>
  );
}
