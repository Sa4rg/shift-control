import { AxiosError } from "axios";

type ApiErrorBody = {
  success: false;
  message: string;
  data: null;
};

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorBody | undefined;

    if (data?.message) {
      return data.message;
    }

    if (error.response?.status === 0 || !error.response) {
      return "Could not connect to the server.";
    }
  }

  return "Something went wrong. Please try again.";
}