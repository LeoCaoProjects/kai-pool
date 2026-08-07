export type User = {
  id: number;
  name: string;
  email: string;
  bio: string | null;
  profileImageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  foodCultures: string[];
  foodCulturesToExplore: string[];
  createdAt: string;
};

export const FOOD_AVAILABILITIES = [
  "PRIVATE",
  "COOK_TOGETHER",
  "GIVEAWAY",
] as const;

export type FoodAvailability = (typeof FOOD_AVAILABILITIES)[number];

export type FoodItem = {
  id: number;
  ownerId: number;
  name: string;
  imageUrl: string | null;
  quantity: string | null;
  availability: FoodAvailability;
  createdAt: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};
