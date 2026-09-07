import { api } from "./api";

export const dashboardService = {
  admin: () => api.get("/dashboard/admin/"),
  employee: () => api.get("/dashboard/employee/"),
};
