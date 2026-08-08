import type { CollaborativeMeal, CookingMatch } from "../types/models";
import { apiRequest } from "./client";

export const getCookingMatches = () =>
  apiRequest<CookingMatch[]>("/api/matches");

export const getCookingMatch = (matchedUserId: number) =>
  apiRequest<CookingMatch>(`/api/matches/${matchedUserId}`);

export const generateCollaborativeRecipes = (matchedUserId: number) =>
  apiRequest<CollaborativeMeal[]>(`/api/matches/${matchedUserId}/recipes`, {
    method: "POST",
  });
