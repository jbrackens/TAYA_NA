const { API_GLOBAL_ENDPOINT } = require("next/config").default().publicRuntimeConfig;

const normalizeBaseUrl = (value: string): string => `${value || ""}`.trim().replace(/\/$/, "");

const buildBackendUrl = (path: string): string | null => {
  const baseUrl = normalizeBaseUrl(API_GLOBAL_ENDPOINT || "");
  if (!baseUrl) {
    return null;
  }
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
};

export type PredictionBackendResponse<T> = {
  status: number;
  data: T;
};

export const fetchPredictionBackend = async <T>(
  path: string,
  init?: RequestInit,
): Promise<PredictionBackendResponse<T> | null> => {
  const url = buildBackendUrl(path);
  if (!url) {
    return null;
  }

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.headers || {}),
      },
    });
    const data = (await response.json()) as T;
    return {
      status: response.status,
      data,
    };
  } catch (_error) {
    return null;
  }
};
