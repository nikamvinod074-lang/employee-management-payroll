/**
 * Centralized helpers for reading/writing JWT tokens.
 * Kept in one place so the storage mechanism (currently localStorage) can be
 * swapped later without touching every call site.
 */
const ACCESS_KEY = "pd_access_token";
const REFRESH_KEY = "pd_refresh_token";

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  setTokens: (access, refresh) => {
    if (access) localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};
