import type { User } from "../types/models";
import type { ChangePasswordRequest, UpdateUserRequest } from "../types/requests";
import { apiRequest } from "./client";

export const updateCurrentUser = (request: UpdateUserRequest) =>
  apiRequest<User>("/api/users/me", {
    method: "PUT",
    body: JSON.stringify(request),
  });

export const changePassword = (request: ChangePasswordRequest) =>
  apiRequest<void>("/api/users/me/password", {
    method: "PUT",
    body: JSON.stringify(request),
  });
