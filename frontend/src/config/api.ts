const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export const API_BASE_URL = (
  configuredUrl || "http://localhost:8080"
).replace(/\/+$/, "");

export const buildApiUrl = (path: string): string => {
  const normalisedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalisedPath}`;
};
