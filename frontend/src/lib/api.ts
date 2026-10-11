import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

let accessToken: string | null = null; // kept in memory only, not localStorage
export const setAccessToken = (t: string | null) => { accessToken = t; };
export const getAccessToken = () => accessToken;
let onSessionExpired = () => {};
export const setOnSessionExpired = (fn: () => void) => { onSessionExpired = fn; };


export const api = axios.create({ baseURL: "/api", withCredentials: true });

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Several requests can fail with 401 at once, so they share one refresh call
let refreshPromise: Promise<string> | null = null;

export const refreshAccessToken = () => {
  refreshPromise ??= axios
    .post<{ accessToken: string }>("/api/auth/refresh", {}, { withCredentials: true })
    .then((res) => {
      setAccessToken(res.data.accessToken);
      return res.data.accessToken;
    })
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
};

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const isAuthCall = original?.url?.startsWith("/auth/");
    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        setAccessToken(null); // refresh failed, so the user has to log in again
        onSessionExpired();   // refresh failed, so the user has to log in again
      }
    }
    return Promise.reject(error);
  },
);

// Your errorHandler returns { success, message }, so this pulls out a readable message
type ErrorBody = {
  message?: string;
  error?: string;
  errors?: { formErrors?: string[]; fieldErrors?: Record<string, string[] | undefined> };
};

export const getErrorMessage = (err: unknown) => {
  if (!axios.isAxiosError(err)) return "Something went wrong";
  if (!err.response) return "Cannot reach the server";
  const data = err.response.data as ErrorBody | string | undefined;
  if (typeof data === "string") return data || "Something went wrong"; // e.g. the rate limiter
  return (
    data?.message ??
    data?.error ??
    data?.errors?.formErrors?.[0] ??
    Object.values(data?.errors?.fieldErrors ?? {})[0]?.[0] ??
    "Something went wrong"
  );
};

