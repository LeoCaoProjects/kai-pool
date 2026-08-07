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
  onboardingCompleted: boolean;
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

export type FoodContribution = {
  foodId: number;
  name: string;
  quantity: string | null;
  imageUrl: string | null;
};

export type MealPreview = {
  mealName: string;
  description: string;
  culturalOrigin: string;
  ingredientsFromYou: string[];
  ingredientsFromThem: string[];
  optionalMissingIngredients: string[];
  imageUrl: string | null;
  imageSource: string | null;
  imageAttribution: string | null;
};

export type CookingMatch = {
  matchedUserId: number;
  matchedUserName: string;
  matchedUserBio: string | null;
  matchedUserProfileImageUrl: string | null;
  matchedUserFoodCultures: string[];
  distanceKm: number;
  matchScore: number;
  matchReason: string;
  yourContributions: FoodContribution[];
  theirContributions: FoodContribution[];
  possibleMeals: MealPreview[];
};

export type CollaborativeMeal = {
  mealName: string;
  description: string;
  culturalOriginOrInspiration: string;
  ingredientsFromYou: string[];
  ingredientsFromThem: string[];
  optionalMissingIngredients: string[];
  cookingInstructions: string[];
  imageUrl: string | null;
  imageSource: string | null;
  imageAttribution: string | null;
};

export type MarketplaceFoodItem = Omit<FoodItem, "ownerId"> & {
  ownerId: number;
  ownerName: string;
  distanceKm: number | null;
  claimedAt: string | null;
};

export type CookingConnectionStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export type CookingConnection = {
  id: number;
  status: CookingConnectionStatus;
  incoming: boolean;
  otherUserId: number;
  otherUserName: string;
  otherUserBio: string | null;
  otherUserProfileImageUrl: string | null;
  otherUserFoodCultures: string[];
  contactEmail: string | null;
  meetingPlace: string | null;
  meetingTime: string | null;
  meetingNote: string | null;
  createdAt: string;
  respondedAt: string | null;
  updatedAt: string;
};

export type MeetingArrangement = {
  meetingPlace: string | null;
  meetingTime: string | null;
  meetingNote: string | null;
};

export type AuthResponse = {
  token: string;
  user: User;
};
