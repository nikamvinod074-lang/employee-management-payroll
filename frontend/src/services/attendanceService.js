import { api } from "./api";

export const attendanceService = {
  list: (params) => api.get("/attendance/", { params }),
  create: (payload) => api.post("/attendance/", payload),
  update: (id, payload) => api.patch(`/attendance/${id}/`, payload),
  remove: (id) => api.delete(`/attendance/${id}/`),
  summary: (employeeId, params) => api.get(`/attendance/summary/${employeeId}/`, { params }),
  monthlyReport: (params) => api.get("/attendance/report/", { params }),
};
