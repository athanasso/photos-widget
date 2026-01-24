/**
 * Secure Storage Service
 * Handles secure token storage using expo-secure-store
 */

import * as SecureStore from "expo-secure-store";

const STORAGE_KEYS = {
  ACCESS_TOKEN: "google_access_token",
  REFRESH_TOKEN: "google_refresh_token",
  TOKEN_EXPIRY: "google_token_expiry",
  USER_INFO: "google_user_info",
} as const;

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

/**
 * Save authentication tokens securely
 */
export async function saveTokens(tokenData: TokenData): Promise<void> {
  try {
    await Promise.all([
      SecureStore.setItemAsync(
        STORAGE_KEYS.ACCESS_TOKEN,
        tokenData.accessToken,
      ),
      SecureStore.setItemAsync(
        STORAGE_KEYS.REFRESH_TOKEN,
        tokenData.refreshToken,
      ),
      SecureStore.setItemAsync(
        STORAGE_KEYS.TOKEN_EXPIRY,
        tokenData.expiresAt.toString(),
      ),
    ]);
  } catch (error) {
    console.error("Error saving tokens:", error);
    throw new Error("Failed to save authentication tokens");
  }
}

/**
 * Retrieve stored tokens
 */
export async function getTokens(): Promise<TokenData | null> {
  try {
    const [accessToken, refreshToken, expiryStr] = await Promise.all([
      SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
      SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
      SecureStore.getItemAsync(STORAGE_KEYS.TOKEN_EXPIRY),
    ]);

    if (!accessToken || !refreshToken || !expiryStr) {
      return null;
    }

    return {
      accessToken,
      refreshToken,
      expiresAt: parseInt(expiryStr, 10),
    };
  } catch (error) {
    console.error("Error getting tokens:", error);
    return null;
  }
}

/**
 * Get access token (returns null if expired)
 */
export async function getAccessToken(): Promise<string | null> {
  const tokens = await getTokens();
  if (!tokens) return null;

  // Check if token is expired (with 5 minute buffer)
  const now = Date.now();
  const bufferMs = 5 * 60 * 1000; // 5 minutes

  if (tokens.expiresAt - bufferMs < now) {
    return null; // Token is expired or about to expire
  }

  return tokens.accessToken;
}

/**
 * Get refresh token
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
  } catch (error) {
    console.error("Error getting refresh token:", error);
    return null;
  }
}

/**
 * Check if tokens are expired
 */
export async function isTokenExpired(): Promise<boolean> {
  const tokens = await getTokens();
  if (!tokens) return true;

  const now = Date.now();
  const bufferMs = 5 * 60 * 1000; // 5 minutes buffer

  return tokens.expiresAt - bufferMs < now;
}

/**
 * Save user info
 */
export async function saveUserInfo(userInfo: UserInfo): Promise<void> {
  try {
    await SecureStore.setItemAsync(
      STORAGE_KEYS.USER_INFO,
      JSON.stringify(userInfo),
    );
  } catch (error) {
    console.error("Error saving user info:", error);
  }
}

/**
 * Get user info
 */
export async function getUserInfo(): Promise<UserInfo | null> {
  try {
    const data = await SecureStore.getItemAsync(STORAGE_KEYS.USER_INFO);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error getting user info:", error);
    return null;
  }
}

/**
 * Clear all stored auth data (logout)
 */
export async function clearAuthData(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN_EXPIRY),
      SecureStore.deleteItemAsync(STORAGE_KEYS.USER_INFO),
    ]);
  } catch (error) {
    console.error("Error clearing auth data:", error);
  }
}
