import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import ErrorState from "../components/common/ErrorState";
import LoadingState from "../components/common/LoadingState";
import PageHeader from "../components/common/PageHeader";
import { useToast } from "../context/ToastContext";
import { getErrorMessage } from "../services/api";
import { departmentService } from "../services/departmentService";
import { employeeService } from "../services/employeeService";

const EMPTY_FORM = {
  first_name: "", last_name: "", email: "", phone: "", address: "",
  date_of_birth: "", gender: "PREFER_NOT_TO_SAY", department: "", designation: "",
  joining_date: "", employment_type: "FULL_TIME", employment_status: "ACTIVE",
  basic_salary: "", bank_name: "", bank_account_number: "", bank_ifsc_or_routing: "",
};

export default function EmployeeFormPage({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    departmentService.list({ page_size: 100 }).then(({ data }) => setDepartments(data.results || data));
  }, []);

  useEffect(() => {
    if (mode !== "edit") return;
    setLoading(true);
    employeeService
      .get(id)
      .then(({ data }) => {
        setForm({
          ...EMPTY_FORM,
          ...data,
          department: data.department?.toString() || "",
          date_of_birth: data.date_of_birth || "",
        });
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id, mode]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setSubmitting(true);
    try {
      const payload = { ...form, department: Number(form.department) };
      if (mode === "create") {
        const { data } = await employeeService.create(payload);
        showToast("Employee added successfully.", "success");
        navigate(`/employees/${data.id}`);
      } else {
        await employeeService.update(id, payload);
        showToast("Employee updated successfully.", "success");
        navigate(`/employees/${id}`);
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
      }
      showToast(getErrorMessage(err), "danger");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Loading employee…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader
        title={mode === "create" ? "Add Employee" : "Edit Employee"}
        subtitle={mode === "create" ? "Create a new employee record and (optionally) issue system access." : "Update this employee's details."}
      />

      <form onSubmit={handleSubmit}>
        <div className="pd-card mb-3">
          <div className="pd-card-header"><h5>Personal Information</h5></div>
          <div className="pd-card-body row g-3">
            <Field label="First Name" error={fieldErrors.first_name}>
              <input className="form-control" value={form.first_name} onChange={handleChange("first_name")} required />
            </Field>
            <Field label="Last Name" error={fieldErrors.last_name}>
              <input className="form-control" value={form.last_name} onChange={handleChange("last_name")} required />
            </Field>
            <Field label="Email" error={fieldErrors.email}>
              <input type="email" className="form-control" value={form.email} onChange={handleChange("email")} required />
            </Field>
            <Field label="Phone" error={fieldErrors.phone}>
              <input className="form-control" value={form.phone} onChange={handleChange("phone")} placeholder="+91 90000 00000" required />
            </Field>
            <Field label="Date of Birth" error={fieldErrors.date_of_birth}>
              <input type="date" className="form-control" value={form.date_of_birth} onChange={handleChange("date_of_birth")} />
            </Field>
            <Field label="Gender" error={fieldErrors.gender}>
              <select className="form-select" value={form.gender} onChange={handleChange("gender")}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>
            </Field>
            <Field label="Address" error={fieldErrors.address} full>
              <textarea className="form-control" rows={2} value={form.address} onChange={handleChange("address")} />
            </Field>
          </div>
        </div>

        <div className="pd-card mb-3">
          <div className="pd-card-header"><h5>Employment Details</h5></div>
          <div className="pd-card-body row g-3">
            <Field label="Department" error={fieldErrors.department}>
              <select className="form-select" value={form.department} onChange={handleChange("department")} required>
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Designation" error={fieldErrors.designation}>
              <input className="form-control" value={form.designation} onChange={handleChange("designation")} required />
            </Field>
            <Field label="Joining Date" error={fieldErrors.joining_date}>
              <input type="date" className="form-control" value={form.joining_date} onChange={handleChange("joining_date")} required />
            </Field>
            <Field label="Employment Type" error={fieldErrors.employment_type}>
              <select className="form-select" value={form.employment_type} onChange={handleChange("employment_type")}>
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERN">Intern</option>
              </select>
            </Field>
            <Field label="Employment Status" error={fieldErrors.employment_status}>
              <select className="form-select" value={form.employment_status} onChange={handleChange("employment_status")}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="RESIGNED">Resigned</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </Field>
            <Field label="Basic Salary (₹ / month)" error={fieldErrors.basic_salary}>
              <input type="number" min="0" step="0.01" className="form-control pd-mono" value={form.basic_salary} onChange={handleChange("basic_salary")} required />
            </Field>
          </div>
        </div>

        <div className="pd-card mb-3">
          <div className="pd-card-header"><h5>Bank Details <span className="text-muted fw-normal">(optional)</span></h5></div>
          <div className="pd-card-body row g-3">
            <Field label="Bank Name" error={fieldErrors.bank_name}>
              <input className="form-control" value={form.bank_name} onChange={handleChange("bank_name")} />
            </Field>
            <Field label="Account Number" error={fieldErrors.bank_account_number}>
              <input className="form-control pd-mono" value={form.bank_account_number} onChange={handleChange("bank_account_number")} />
            </Field>
            <Field label="IFSC / Routing Number" error={fieldErrors.bank_ifsc_or_routing}>
              <input className="form-control pd-mono" value={form.bank_ifsc_or_routing} onChange={handleChange("bank_ifsc_or_routing")} />
            </Field>
          </div>
        </div>

        <div className="d-flex gap-2 justify-content-end">
          <button type="button" className="btn btn-light border" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn btn-pd-primary px-4" disabled={submitting}>
            {submitting ? "Saving…" : mode === "create" ? "Add Employee" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, error, children, full }) {
  return (
    <div className={full ? "col-12" : "col-sm-6 col-lg-4"}>
      <label className="form-label small fw-semibold">{label}</label>
      {children}
      {error && <div className="text-danger small mt-1">{Array.isArray(error) ? error[0] : error}</div>}
    </div>
  );
}
