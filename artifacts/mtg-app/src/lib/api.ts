import { setBaseUrl } from "@workspace/api-client-react";

export function configureApiClient(): void {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  setBaseUrl(apiBaseUrl || null);
}
