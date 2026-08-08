import type { MarketplaceFoodItem } from "../types/models";
import { apiRequest } from "./client";

/** Fetches food listings that have a location set on their owner's profile. */
export const getMarketplaceFoods = () =>
  apiRequest<MarketplaceFoodItem[]>("/api/foods/marketplace");

export const getMarketplaceFood = (id: number) =>
  apiRequest<MarketplaceFoodItem>(`/api/foods/marketplace/${id}`);

export const getClaimedMarketplaceFoods = () =>
  apiRequest<MarketplaceFoodItem[]>("/api/foods/marketplace/claimed");

export const claimMarketplaceFood = (id: number) =>
  apiRequest<MarketplaceFoodItem>(`/api/foods/marketplace/${id}/claim`, {
    method: "POST",
  });
