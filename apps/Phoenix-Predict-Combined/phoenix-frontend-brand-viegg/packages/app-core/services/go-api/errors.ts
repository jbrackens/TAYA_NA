import type { AxiosError } from "axios";
import type { GoErrorResponse, AppError } from "./types";

/**
 * Transform a Go API error into the AppError shape that existing
 * ErrorComponent and CoreAlert components expect.
 */
export function transformGoError(
  axiosError: AxiosError<GoErrorResponse>,
): AppError {
  const goError = axiosError.response?.data?.error;

  if (goError) {
    return {
      payload: {
        errors: [
          {
            errorCode: goError.code,
            details: goError.message,
          },
        ],
      },
    };
  }

  // Network error or non-JSON response
  return {
    payload: {
      errors: [
        {
          errorCode: "NETWORK_ERROR",
          details:
            axiosError.message || "An unexpected error occurred",
        },
      ],
    },
  };
}

/**
 * Type guard: check if an unknown error is an AppError.
 */
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    "payload" in error &&
    typeof (error as AppError).payload === "object" &&
    Array.isArray((error as AppError).payload?.errors)
  );
}
