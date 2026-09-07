import axios from "axios";

import { tokenStorage } from "../utils/tokenStorage";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export const api = axios.create({
  baseURL: BASE_URL,
});

// Attach the access token to every outgoing request.
api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Automatically refresh an expired access token exactly once per request,
// then retry the original request. If the refresh itself fails, the user is
// signed out and sent back to the login page.
let isRefreshing = false;
let pendingQueue = [];

function resolveQueue(error, token) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    const isAuthEndpoint =
      originalRequest?.url?.includes("/auth/login") || originalRequest?.url?.includes("/auth/token/refresh");

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      const refresh = tokenStorage.getRefresh();

      if (!refresh) {
        isRefreshing = false;
        tokenStorage.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, { refresh });
        tokenStorage.setTokens(data.access, null);
        api.defaults.headers.common.Authorization = `Bearer ${data.access}`;
        resolveQueue(null, data.access);
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        resolveQueue(refreshError, null);
        tokenStorage.clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/** Extracts a user-friendly message from any API error response. */
export function getErrorMessage(error) {
  if (error?.response?.data?.detail) return error.response.data.detail;
  if (error?.response?.data?.errors) {
    const errors = error.response.data.errors;
    const firstKey = Object.keys(errors)[0];
    const firstValue = Array.isArray(errors[firstKey]) ? errors[firstKey][0] : errors[firstKey];
    return `${firstKey}: ${firstValue}`;
  }
  if (error?.message === "Network Error") return "Unable to reach the server. Please check your connection.";
  return "Something went wrong. Please try again.";
}
