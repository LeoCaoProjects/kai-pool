import type { AuthResponse, User } from "../types/models";
import type { LoginRequest, RegisterRequest } from "../types/requests";
import { apiRequest } from "./client";

export const register = (request: RegisterRequest) =>
  apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(request),
  });

export const login = (request: LoginRequest) =>
  apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(request),
  });

export const getAuthenticatedUser = () => apiRequest<User>("/api/auth/me");

export const requestPasswordReset = (email: string) =>
  apiRequest<void>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const resetPassword = (email: string, code: string, newPassword: string) =>
  apiRequest<void>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, code, newPassword }),
  });
