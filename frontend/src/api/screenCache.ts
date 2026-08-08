import type {
  CookingConnection,
  CookingMatch,
  FoodItem,
  MarketplaceFoodItem,
} from "../types/models";

type CacheEntry<T> = {
  data?: T;
  promise?: Promise<T>;
};

const entries = {
  foods: {} as CacheEntry<FoodItem[]>,
  matches: {} as CacheEntry<CookingMatch[]>,
  connections: {} as CacheEntry<CookingConnection[]>,
  marketplaceAvailable: {} as CacheEntry<MarketplaceFoodItem[]>,
  marketplaceClaimed: {} as CacheEntry<MarketplaceFoodItem[]>,
};

export type ScreenCacheKey = keyof typeof entries;

export const peekScreenCache = <K extends ScreenCacheKey>(key: K) =>
  entries[key].data as (typeof entries)[K]["data"];

export const loadScreenCache = async <T>(
  key: ScreenCacheKey,
  fetcher: () => Promise<T>,
  force = false,
): Promise<T> => {
  const entry = entries[key] as CacheEntry<T>;
  if (!force && entry.data !== undefined) return entry.data;
  if (entry.promise) return entry.promise;

  entry.promise = fetcher()
    .then((data) => {
      entry.data = data;
      return data;
    })
    .finally(() => {
      entry.promise = undefined;
    });
  return entry.promise;
};

export const updateScreenCache = <T>(key: ScreenCacheKey, data: T) => {
  (entries[key] as CacheEntry<T>).data = data;
};

export const clearScreenCache = () => {
  Object.values(entries).forEach((entry) => {
    entry.data = undefined;
    entry.promise = undefined;
  });
};
