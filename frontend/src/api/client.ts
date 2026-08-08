import AsyncStorage from "@react-native-async-storage/async-storage";
import { buildApiUrl } from "../config/api";
import type { ApiErrorResponse } from "../types/api";

let accessToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;
export const ACCESS_TOKEN_KEY = "kai-pool-token";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

export const setApiToken = (token: string | null) => {
  accessToken = token;
};

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
};

export const apiRequest = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  if (!accessToken) {
    accessToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  }
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers,
  });

  if (response.status === 401) {
    accessToken = null;
    await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new ApiError(
      error?.message || `API request failed with status ${response.status}`,
      response.status,
      error?.fields,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};
