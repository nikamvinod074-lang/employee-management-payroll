import { api } from "./api";

export const departmentService = {
  list: (params) => api.get("/departments/", { params }),
  get: (id) => api.get(`/departments/${id}/`),
  create: (payload) => api.post("/departments/", payload),
  update: (id, payload) => api.patch(`/departments/${id}/`, payload),
  remove: (id) => api.delete(`/departments/${id}/`),
};
