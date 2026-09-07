import { api } from "./api";

export const authService = {
  login: (email, password) => api.post("/auth/login/", { email, password }),
  logout: (refresh) => api.post("/auth/logout/", { refresh }),
  me: () => api.get("/auth/me/"),
  changePassword: (payload) => api.post("/auth/change-password/", payload),
  forgotPassword: (email) => api.post("/auth/forgot-password/", { email }),
  resetPassword: (payload) => api.post("/auth/reset-password/", payload),
  listUsers: (params) => api.get("/auth/users/", { params }),
  createUser: (payload) => api.post("/auth/users/", payload),
};
