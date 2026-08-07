import type { RecipeSuggestion } from "../types/requests";
import { apiRequest } from "./client";

export const getRecipeSuggestions = (limit = 8) =>
  apiRequest<RecipeSuggestion[]>(`/api/recipes/suggestions?limit=${limit}`);

export const previewRecipeSuggestions = (ingredients: string, limit = 8) =>
  apiRequest<RecipeSuggestion[]>(
    `/api/recipes/preview?ingredients=${encodeURIComponent(ingredients)}&limit=${limit}`,
  );
