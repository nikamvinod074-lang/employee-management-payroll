import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import ConfirmDialog from "../components/common/ConfirmDialog";
import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import { IconEdit, IconPlus, IconTrash } from "../components/common/Icons";
import LoadingState from "../components/common/LoadingState";
import PageHeader from "../components/common/PageHeader";
import Pagination from "../components/common/Pagination";
import SearchBar from "../components/common/SearchBar";
import StatusBadge from "../components/common/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { usePaginatedList } from "../hooks/usePaginatedList";
import { getErrorMessage } from "../services/api";
import { departmentService } from "../services/departmentService";
import { employeeService } from "../services/employeeService";
import { initials } from "../utils/format";

export default function EmployeesPage() {
  const { role } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const isManager = role === "ADMIN" || role === "HR";

  const [search, setSearch] = useState("");
  const [departments, setDepartments] = useState([]);
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { data, meta, loading, error, updateParams, setPage, reload } = usePaginatedList(employeeService.list);

  useEffect(() => {
    if (isManager) {
      departmentService.list({ page_size: 100 }).then(({ data: body }) => setDepartments(body.results || body));
    }
  }, [isManager]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      updateParams({ search, department: deptFilter || undefined, status: statusFilter || undefined });
    }, 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, deptFilter, statusFilter]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await employeeService.remove(deleteTarget.id);
      showToast(`${deleteTarget.full_name} has been deactivated.`, "success");
      setDeleteTarget(null);
      reload();
    } catch (err) {
      showToast(getErrorMessage(err), "danger");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle={isManager ? "Manage your organization's employee records." : "Your employee record."}
        actions={
          isManager && (
            <button className="btn btn-pd-accent d-flex align-items-center gap-1" onClick={() => navigate("/employees/add")}>
              <IconPlus width="16" height="16" /> Add Employee
            </button>
          )
        }
      />

      {isManager && (
        <div className="d-flex flex-wrap gap-2 mb-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name, ID, email…" />
          <select className="form-select" style={{ maxWidth: 200 }} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select className="form-select" style={{ maxWidth: 180 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="RESIGNED">Resigned</option>
            <option value="TERMINATED">Terminated</option>
          </select>
        </div>
      )}

      <div className="pd-card">
        {loading && <LoadingState label="Loading employees…" />}
        {!loading && error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && data.length === 0 && (
          <EmptyState title="No employees found" message="Try adjusting your search or filters." />
        )}
        {!loading && !error && data.length > 0 && (
          <div className="table-responsive">
            <table className="table pd-table mb-0">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Type</th>
                  <th>Status</th>
                  {isManager && <th className="text-end">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {data.map((emp) => (
                  <tr key={emp.id} style={{ cursor: "pointer" }}>
                    <td onClick={() => navigate(`/employees/${emp.id}`)}>
                      <div className="d-flex align-items-center gap-2">
                        <div className="pd-avatar">{initials(emp.full_name?.split(" ")[0] || "", emp.full_name?.split(" ")[1] || "")}</div>
                        <div>
                          <div className="fw-semibold">{emp.full_name}</div>
                          <div className="pd-id text-muted" style={{ fontSize: 11.5 }}>{emp.employee_id}</div>
                        </div>
                      </div>
                    </td>
                    <td onClick={() => navigate(`/employees/${emp.id}`)}>{emp.department_name}</td>
                    <td onClick={() => navigate(`/employees/${emp.id}`)}>{emp.designation}</td>
                    <td onClick={() => navigate(`/employees/${emp.id}`)}>{emp.employment_type?.replace("_", " ")}</td>
                    <td onClick={() => navigate(`/employees/${emp.id}`)}><StatusBadge status={emp.employment_status} /></td>
                    {isManager && (
                      <td className="text-end">
                        <Link to={`/employees/${emp.id}/edit`} className="btn btn-sm btn-light border me-1" title="Edit">
                          <IconEdit width="14" height="14" />
                        </Link>
                        <button className="btn btn-sm btn-light border" title="Deactivate" onClick={() => setDeleteTarget(emp)}>
                          <IconTrash width="14" height="14" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination meta={meta} onPageChange={setPage} />

      <ConfirmDialog
        show={!!deleteTarget}
        title="Deactivate employee?"
        message={`This will mark ${deleteTarget?.full_name} as Terminated and preserve their historical attendance, leave, and payroll records. This is not a permanent delete.`}
        confirmLabel="Deactivate"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
