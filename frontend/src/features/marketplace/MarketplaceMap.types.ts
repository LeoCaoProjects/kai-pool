import type { MarketplaceFoodItem } from "../../types/models";

export type GiveawayOwner = {
  ownerId: number;
  ownerName: string;
  latitude: number;
  longitude: number;
  distanceKm: number | null;
  items: MarketplaceFoodItem[];
};

export type MarketplaceMapProps = {
  owners: GiveawayOwner[];
  selectedOwnerId: number | null;
  viewerCoordinate: { latitude: number; longitude: number } | null;
  onSelectOwner: (ownerId: number | null) => void;
};
