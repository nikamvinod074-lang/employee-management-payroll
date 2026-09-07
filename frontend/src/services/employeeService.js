import { api } from "./api";

export const employeeService = {
  list: (params) => api.get("/employees/", { params }),
  get: (id) => api.get(`/employees/${id}/`),
  create: (payload) => api.post("/employees/", payload),
  update: (id, payload) => api.patch(`/employees/${id}/`, payload),
  remove: (id) => api.delete(`/employees/${id}/`),
};
