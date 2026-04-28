import { Method } from "@phoenix-ui/utils";

type RequestOpts = {
  url: string;
  method: Method | string;
  data?: unknown;
};

export const adminApi = {
  request: async <T = unknown>(opts: RequestOpts): Promise<T> => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (opts.data !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(opts.url, {
      method: String(opts.method),
      credentials: "include",
      headers,
      body: opts.data !== undefined ? JSON.stringify(opts.data) : undefined,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      throw new Error(`API ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
  },
};
