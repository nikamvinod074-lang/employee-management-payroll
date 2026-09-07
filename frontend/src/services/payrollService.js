import { api } from "./api";

export const payrollService = {
  list: (params) => api.get("/payroll/", { params }),
  get: (id) => api.get(`/payroll/${id}/`),
  create: (payload) => api.post("/payroll/", payload),
  update: (id, payload) => api.patch(`/payroll/${id}/`, payload),
  remove: (id) => api.delete(`/payroll/${id}/`),
  updateStatus: (id, payload) => api.patch(`/payroll/${id}/status/`, payload),
  payslip: (id) => api.get(`/payroll/${id}/payslip/`),
  myPayslips: (params) => api.get("/payroll/my-payslips/", { params }),
};
