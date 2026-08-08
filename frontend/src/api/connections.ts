import type { CookingConnection, MeetingArrangement } from "../types/models";
import { apiRequest } from "./client";

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
) =>
  apiRequest<CookingConnection>(`/api/cooking-connections/${id}/response`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });

export const updateMeetingArrangement = (
  id: number,
  arrangement: MeetingArrangement,
) =>
  apiRequest<CookingConnection>(`/api/cooking-connections/${id}/arrangement`, {
    method: "PUT",
    body: JSON.stringify(arrangement),
  });
