export type HealthResponse = {
  status: string;
  service: string;
};

export type ApiErrorResponse = {
  message: string;
  fields?: Record<string, string>;
};
