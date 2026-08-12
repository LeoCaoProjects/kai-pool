import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  CookingConnection,
  CookingMatch,
  FoodItem,
  MarketplaceFoodItem,
} from "../types/models";

type CacheEntry<T> = {
  data?: T;
  promise?: Promise<T>;
  revision?: number;
};

const entries = {
  foods: {} as CacheEntry<FoodItem[]>,
  matches: {} as CacheEntry<CookingMatch[]>,
  connections: {} as CacheEntry<CookingConnection[]>,
  marketplaceAvailable: {} as CacheEntry<MarketplaceFoodItem[]>,
  marketplaceClaimed: {} as CacheEntry<MarketplaceFoodItem[]>,
};

export type ScreenCacheKey = keyof typeof entries;

const listeners = new Map<ScreenCacheKey, Set<() => void>>();
const CACHE_PREFIX = "kai-pool-screen-cache-v4";
let cacheOwnerId: number | null = null;

const storageKey = (ownerId: number) => `${CACHE_PREFIX}:${ownerId}`;

const persistScreenCache = () => {
  if (cacheOwnerId == null) return;
  const data = Object.fromEntries(
    Object.entries(entries).map(([key, entry]) => [key, entry.data]),
  );
  void AsyncStorage.setItem(storageKey(cacheOwnerId), JSON.stringify(data));
};

export const hydrateScreenCache = async (ownerId: number) => {
  cacheOwnerId = ownerId;
  const stored = await AsyncStorage.getItem(storageKey(ownerId));
  if (!stored) return;
  try {
    const data = JSON.parse(stored) as Partial<
      Record<ScreenCacheKey, unknown>
    >;
    (Object.keys(entries) as ScreenCacheKey[]).forEach((key) => {
      if (data[key] !== undefined) entries[key].data = data[key] as never;
    });
  } catch {
    await AsyncStorage.removeItem(storageKey(ownerId));
  }
};

export const setScreenCacheOwner = (ownerId: number) => {
  cacheOwnerId = ownerId;
};

const notifyScreenCache = (key: ScreenCacheKey) => {
  listeners.get(key)?.forEach((listener) => listener());
};

export const subscribeScreenCache = (
  key: ScreenCacheKey,
  listener: () => void,
) => {
  const keyListeners = listeners.get(key) ?? new Set<() => void>();
  keyListeners.add(listener);
  listeners.set(key, keyListeners);
  return () => {
    keyListeners.delete(listener);
  };
};

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

  const requestRevision = entry.revision ?? 0;
  const requestPromise = fetcher().then((data) => {
    if ((entry.revision ?? 0) === requestRevision) {
      entry.data = data;
      persistScreenCache();
      notifyScreenCache(key);
      return data;
    }
    return entry.data ?? data;
  });
  entry.promise = requestPromise;
  try {
    return await requestPromise;
  } finally {
    if (entry.promise === requestPromise) entry.promise = undefined;
  }
};

export const updateScreenCache = <T>(key: ScreenCacheKey, data: T) => {
  const entry = entries[key] as CacheEntry<T>;
  entry.revision = (entry.revision ?? 0) + 1;
  entry.data = data;
  persistScreenCache();
  notifyScreenCache(key);
};

export const clearScreenCache = () => {
  const previousOwnerId = cacheOwnerId;
  cacheOwnerId = null;
  Object.values(entries).forEach((entry) => {
    entry.revision = (entry.revision ?? 0) + 1;
    entry.data = undefined;
    entry.promise = undefined;
  });
  listeners.forEach((keyListeners) =>
    keyListeners.forEach((listener) => listener()),
  );
  if (previousOwnerId != null) {
    void AsyncStorage.removeItem(storageKey(previousOwnerId));
  }
};
