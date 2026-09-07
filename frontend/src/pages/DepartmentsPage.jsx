import React, { useState } from "react";
import { Modal } from "react-bootstrap";

import ConfirmDialog from "../components/common/ConfirmDialog";
import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import { IconEdit, IconPlus, IconTrash } from "../components/common/Icons";
import LoadingState from "../components/common/LoadingState";
import PageHeader from "../components/common/PageHeader";
import SearchBar from "../components/common/SearchBar";
import { useToast } from "../context/ToastContext";
import { usePaginatedList } from "../hooks/usePaginatedList";
import { getErrorMessage } from "../services/api";
import { departmentService } from "../services/departmentService";

const EMPTY_FORM = { name: "", code: "", description: "", is_active: true };

export default function DepartmentsPage() {
  const { showToast } = useToast();
  const { data, loading, error, updateParams, reload } = usePaginatedList(departmentService.list, { page_size: 100 });

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setShowModal(true);
  };

  const openEdit = (dept) => {
    setEditing(dept);
    setForm(dept);
    setFieldErrors({});
    setShowModal(true);
  };

  const handleSearch = (value) => {
    setSearch(value);
    updateParams({ search: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    try {
      if (editing) {
        await departmentService.update(editing.id, form);
        showToast("Department updated.", "success");
      } else {
        await departmentService.create(form);
        showToast("Department created.", "success");
      }
      setShowModal(false);
      reload();
    } catch (err) {
      if (err.response?.data?.errors) setFieldErrors(err.response.data.errors);
      showToast(getErrorMessage(err), "danger");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await departmentService.remove(deleteTarget.id);
      showToast("Department deleted.", "success");
      setDeleteTarget(null);
      reload();
    } catch (err) {
      showToast(getErrorMessage(err), "danger");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle="Organize employees into departments."
        actions={
          <button className="btn btn-pd-accent d-flex align-items-center gap-1" onClick={openCreate}>
            <IconPlus width="16" height="16" /> Add Department
          </button>
        }
      />

      <div className="mb-3">
        <SearchBar value={search} onChange={handleSearch} placeholder="Search departments…" />
      </div>

      <div className="pd-card">
        {loading && <LoadingState label="Loading departments…" />}
        {!loading && error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && data.length === 0 && (
          <EmptyState title="No departments yet" message="Create your first department to start assigning employees." />
        )}
        {!loading && !error && data.length > 0 && (
          <div className="table-responsive">
            <table className="table pd-table mb-0">
              <thead>
                <tr><th>Name</th><th>Code</th><th>Employees</th><th>Status</th><th className="text-end">Actions</th></tr>
              </thead>
              <tbody>
                {data.map((dept) => (
                  <tr key={dept.id}>
                    <td className="fw-semibold">{dept.name}</td>
                    <td><span className="pd-id">{dept.code}</span></td>
                    <td>{dept.employee_count}</td>
                    <td>
                      <span className={`pd-badge ${dept.is_active ? "pd-badge-success" : "pd-badge-neutral"}`}>
                        {dept.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-light border me-1" onClick={() => openEdit(dept)} title="Edit">
                        <IconEdit width="14" height="14" />
                      </button>
                      <button className="btn btn-sm btn-light border" onClick={() => setDeleteTarget(dept)} title="Delete">
                        <IconTrash width="14" height="14" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title style={{ fontFamily: "var(--pd-font-display)", fontSize: 17 }}>
              {editing ? "Edit Department" : "Add Department"}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label small fw-semibold">Name</label>
              <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              {fieldErrors.name && <div className="text-danger small mt-1">{fieldErrors.name[0]}</div>}
            </div>
            <div className="mb-3">
              <label className="form-label small fw-semibold">Code</label>
              <input className="form-control pd-mono" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
              {fieldErrors.code && <div className="text-danger small mt-1">{fieldErrors.code[0]}</div>}
            </div>
            <div className="mb-3">
              <label className="form-label small fw-semibold">Description</label>
              <textarea className="form-control" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="isActive" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              <label className="form-check-label small" htmlFor="isActive">Active</label>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn btn-light border" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-pd-primary" disabled={submitting}>{submitting ? "Saving…" : "Save"}</button>
          </Modal.Footer>
        </form>
      </Modal>

      <ConfirmDialog
        show={!!deleteTarget}
        title="Delete department?"
        message={`Delete "${deleteTarget?.name}"? This can only be done if no employees are currently assigned to it.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
