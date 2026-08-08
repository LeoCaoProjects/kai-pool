import Constants from "expo-constants";

const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const expoHost = Constants.expoConfig?.hostUri?.split(":")[0];
const developmentUrl = expoHost
  ? `http://${expoHost}:8080`
  : "http://localhost:8080";

export const API_BASE_URL = (configuredUrl || developmentUrl).replace(
  /\/+$/,
  "",
);

export const buildApiUrl = (path: string): string => {
  const normalisedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalisedPath}`;
};
