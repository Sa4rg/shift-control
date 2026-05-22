import axios, { AxiosError } from "axios";
import { env } from "@/src/config/env";
import { clearAccessToken, getAccessToken } from "@/src/storage/token";
import { notifyUnauthorized } from "@/src/auth/authEvents";

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(async (config) => {
  const accessToken = await getAccessToken();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await clearAccessToken();
      await notifyUnauthorized();
    }

    return Promise.reject(error);
  }
);