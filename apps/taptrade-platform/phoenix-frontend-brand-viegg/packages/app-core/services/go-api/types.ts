/**
 * Shared types for the Go backend API client layer.
 */

/** Standard Go API error response shape. */
export interface GoErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; reason: string }>;
    request_id?: string;
    timestamp?: string;
  };
}

/** Standard Go API pagination envelope. */
export interface GoPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

/** Standard Go API paginated response. */
export interface GoPaginatedResponse<T> {
  data: T[];
  pagination: GoPagination;
}

/** App-level error shape consumed by existing error components. */
export interface AppError {
  payload: {
    errors: Array<{ errorCode: string; details: string }>;
  };
}
