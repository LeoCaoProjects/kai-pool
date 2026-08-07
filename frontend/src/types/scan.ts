export type DetectedFood = {
  name: string;
  quantity: string | null;
  confidence: number | null;
};

export type FoodRecognitionResponse = {
  items: DetectedFood[];
};
