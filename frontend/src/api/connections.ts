import type { CookingConnection, MeetingArrangement } from "../types/models";
import { ApiError, apiRequest } from "./client";

export const getCookingConnections = () =>
  apiRequest<CookingConnection[]>("/api/cooking-connections");

export const getCookingConnection = (id: number) =>
  apiRequest<CookingConnection>(`/api/cooking-connections/${id}`);

export const requestCookingConnection = (recipientId: number) =>
  apiRequest<CookingConnection>(
    `/api/cooking-connections/requests/${recipientId}`,
    { method: "POST" },
  );

export const respondToCookingConnection = (
  id: number,
  status: "ACCEPTED" | "DECLINED",
) => respond(id, status);

const respond = async (
  id: number,
  status: "ACCEPTED" | "DECLINED",
  retry = true,
): Promise<CookingConnection> => {
  try {
    return await apiRequest<CookingConnection>(`/api/cooking-connections/${id}/response`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
  } catch (error) {
    if (retry && error instanceof ApiError && error.status === 500) {
      return respond(id, status, false);
    }
    throw error;
  }
};

export const updateMeetingArrangement = (
  id: number,
  arrangement: MeetingArrangement,
) =>
  apiRequest<CookingConnection>(`/api/cooking-connections/${id}/arrangement`, {
    method: "PUT",
    body: JSON.stringify(arrangement),
  });
