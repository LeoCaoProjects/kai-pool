import type { FoodRecognitionResponse } from "../types/scan";
import { apiRequest } from "./client";

type ScanImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string;
  file?: File;
};

export const scanFood = (image: ScanImage) => {
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

  return apiRequest<FoodRecognitionResponse>("/api/scan", {
    method: "POST",
    body: formData,
  });
};
