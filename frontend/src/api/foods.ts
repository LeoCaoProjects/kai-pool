import type { FoodItem } from "../types/models";
import type { FoodRequest } from "../types/requests";
import { apiRequest } from "./client";

export const getFoods = () => apiRequest<FoodItem[]>("/api/foods");

export const createFood = (request: FoodRequest) =>
  apiRequest<FoodItem>("/api/foods", {
    method: "POST",
    body: JSON.stringify(request),
  });

export const updateFood = (id: number, request: FoodRequest) =>
  apiRequest<FoodItem>(`/api/foods/${id}`, {
    method: "PUT",
    body: JSON.stringify(request),
  });

export const deleteFood = (id: number) =>
  apiRequest<void>(`/api/foods/${id}`, { method: "DELETE" });
