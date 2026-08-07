import type { FoodAvailability } from "./models";

export type RegisterRequest = {
  name: string;
  email: string;
  password: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type UpdateUserRequest = {
  name: string;
  bio: string | null;
  profileImageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  foodCultures: string[];
  foodCulturesToExplore: string[];
};

export type FoodRequest = {
  name: string;
  imageUrl: string | null;
  quantity: string | null;
  availability: FoodAvailability;
};

export type RecipeSuggestion = {
  culture: string;
  recipeName: string;
  description: string;
  matchedIngredients: string[];
  missingIngredients: string[];
  matchPercent: number;
};
