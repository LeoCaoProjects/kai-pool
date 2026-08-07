import type { RecipeSuggestion } from "../types/requests";
import { apiRequest } from "./client";

export const getRecipeSuggestions = (limit = 8) =>
  apiRequest<RecipeSuggestion[]>(`/api/recipes/suggestions?limit=${limit}`);
