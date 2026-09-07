import { api } from "./api";

export const leaveService = {
  list: (params) => api.get("/leaves/", { params }),
  create: (payload) => api.post("/leaves/", payload),
  update: (id, payload) => api.patch(`/leaves/${id}/`, payload),
  remove: (id) => api.delete(`/leaves/${id}/`),
  review: (id, payload) => api.post(`/leaves/${id}/review/`, payload),
};
