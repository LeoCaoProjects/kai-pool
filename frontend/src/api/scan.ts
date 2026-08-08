import type { FoodRecognitionResponse } from "../types/scan";
import { ApiError, apiRequest } from "./client";

type ScanImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string;
  file?: File;
};

export const scanFood = async (image: ScanImage) => {
  const formData = new FormData();
  if (image.file) {
    formData.append("image", image.file, image.fileName || image.file.name);
  } else {
    formData.append(
      "image",
      {
        uri: image.uri,
        name: image.fileName || "food.jpg",
        type: image.mimeType || "image/jpeg",
      } as unknown as Blob,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35_000);
  try {
    return await apiRequest<FoodRecognitionResponse>("/api/scan", {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
  } catch (caught) {
    if (caught instanceof Error && caught.name === "AbortError") {
      throw new ApiError("Food recognition took too long. Please try again.", 408);
    }
    throw caught;
  } finally {
    clearTimeout(timeout);
  }
};
