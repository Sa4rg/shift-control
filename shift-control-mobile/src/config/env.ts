const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error("Missing EXPO_PUBLIC_API_BASE_URL environment variable");
}

export const env = {
  apiBaseUrl,
};