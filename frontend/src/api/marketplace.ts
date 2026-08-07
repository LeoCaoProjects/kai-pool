import type { MarketplaceFoodItem } from "../types/models";
import { apiRequest } from "./client";

/** Fetches food listings that have a location set on their owner's profile. */
export const getMarketplaceFoods = () =>
  apiRequest<MarketplaceFoodItem[]>("/api/foods/marketplace");
