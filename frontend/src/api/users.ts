import type { User } from "../types/models";
import type { UpdateUserRequest } from "../types/requests";
import { apiRequest } from "./client";

export const updateCurrentUser = (request: UpdateUserRequest) =>
  apiRequest<User>("/api/users/me", {
    method: "PUT",
    body: JSON.stringify(request),
  });
