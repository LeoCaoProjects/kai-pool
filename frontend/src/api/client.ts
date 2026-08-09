import AsyncStorage from "@react-native-async-storage/async-storage";
import { buildApiUrl } from "../config/api";
import type { ApiErrorResponse } from "../types/api";

let accessToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;
let sessionValidation:
  | { token: string; promise: Promise<boolean> }
  | null = null;
export const ACCESS_TOKEN_KEY = "kai-pool-token";
export const AUTH_USER_KEY = "kai-pool-user";

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

const sessionIsStillValid = (token: string): Promise<boolean> => {
  if (sessionValidation?.token === token) return sessionValidation.promise;

  const promise = fetch(buildApiUrl("/api/auth/me"), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.status !== 401)
    // A network failure cannot prove that a local session is invalid.
    .catch(() => true)
    .finally(() => {
      if (sessionValidation?.token === token) sessionValidation = null;
    });
  sessionValidation = { token, promise };
  return promise;
};

export const apiRequest = async <T>(
  path: string,
  options: RequestInit = {},
  unauthorizedRetries = 2,
): Promise<T> => {
  // AsyncStorage is the source of truth across Expo Fast Refreshes and
  // concurrent requests; the module value is only an immediate login cache.
  const storedToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  if (storedToken) accessToken = storedToken;
  else if (!accessToken) accessToken = null;
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const requestToken = accessToken;

  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = (await response
      .json()
      .catch(() => null)) as ApiErrorResponse | null;
    const sessionIsInvalid =
      response.status === 401 && error?.message === "Authentication required";
    if (sessionIsInvalid && !requestToken) {
      await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, AUTH_USER_KEY]);
      unauthorizedHandler?.();
      throw new ApiError(error.message, response.status, error.fields);
    }
    const tokenWasConfirmedInvalid =
      sessionIsInvalid &&
      requestToken &&
      !(await sessionIsStillValid(requestToken));
    if (
      sessionIsInvalid &&
      requestToken &&
      !tokenWasConfirmedInvalid &&
      unauthorizedRetries > 0
    ) {
      return apiRequest<T>(path, options, unauthorizedRetries - 1);
    }
    if (tokenWasConfirmedInvalid && accessToken === requestToken) {
      accessToken = null;
      await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
      unauthorizedHandler?.();
    }
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
