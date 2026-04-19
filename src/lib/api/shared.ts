import { API_BASE_URL } from "./config";
import type { ErrorResponse } from "./types";

export class APIError extends Error {
  status: number;
  code: string;
  detail: string | object;

  constructor(status: number, code: string, detail: string | object) {
    super(typeof detail === "string" ? detail : JSON.stringify(detail));
    this.name = "APIError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export function buildQuery(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null && item !== "") {
          searchParams.append(key, String(item));
        }
      }
      continue;
    }

    searchParams.append(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = (await response.json().catch(() => ({
      code: "UNKNOWN_ERROR",
      detail: response.statusText,
    }))) as ErrorResponse;

    throw new APIError(
      response.status,
      error.code ?? "UNKNOWN_ERROR",
      error.detail,
    );
  }

  return response.json() as Promise<T>;
}

export function absoluteApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
