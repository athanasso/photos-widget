/**
 * Google Authentication Service
 * Handles OAuth 2.0 authentication with Google using a Vercel backend for token exchange
 */

import * as AuthSession from "expo-auth-session";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import {
  clearAuthData,
  getRefreshToken,
  getTokens,
  isTokenExpired,
  saveTokens,
  saveUserInfo,
  type TokenData,
  type UserInfo,
} from "./secure-storage";

// Complete auth session for web browser
WebBrowser.maybeCompleteAuthSession();

// Vercel backend URL for OAuth
const AUTH_SERVER_URL = "https://photos-widget-auth.vercel.app";

// Google OAuth endpoints
const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

// OAuth scopes for Google Photos Picker API
const SCOPES = [
  "openid",
  "profile",
  "email",
  "https://www.googleapis.com/auth/photospicker.mediaitems.readonly",
];

// Get client IDs from app config
const getClientIds = () => {
  const extra = Constants.expoConfig?.extra;
  return {
    webClientId: extra?.googleClientId || "",
    androidClientId: extra?.googleAndroidClientId || "",
  };
};

/**
 * Get the OAuth authorization URL that redirects to our Vercel backend
 */
export function getAuthorizationUrl(): string {
  const { webClientId } = getClientIds();
  const redirectUri = `${AUTH_SERVER_URL}/api/callback`;
  
  const params = new URLSearchParams({
    client_id: webClientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Hook for handling the OAuth flow
 */
export function useGoogleAuthRequest() {
  const { webClientId } = getClientIds();
  const redirectUri = `${AUTH_SERVER_URL}/api/callback`;

  console.log("OAuth Config:", { 
    clientId: webClientId?.substring(0, 30) + "...", 
    redirectUri 
  });

  // We'll use a custom flow that opens the auth URL directly
  // and listens for the deep link callback
  const request = {
    clientId: webClientId,
    redirectUri,
    scopes: SCOPES,
  };

  return { request, response: null, promptAsync: null };
}

/**
 * Start the OAuth flow by opening the browser
 */
export async function startOAuthFlow(): Promise<void> {
  const authUrl = getAuthorizationUrl();
  console.log("Opening auth URL:", authUrl);
  
  await WebBrowser.openBrowserAsync(authUrl, {
    showInRecents: true,
  });
}

/**
 * Handle the OAuth callback from deep link
 * The Vercel backend redirects back to the app with tokens in the URL
 */
export async function handleOAuthCallback(url: string): Promise<TokenData | null> {
  console.log("Handling OAuth callback:", url);
  
  const parsedUrl = Linking.parse(url);
  const params = parsedUrl.queryParams || {};

  console.log("Parsed params:", params);

  const accessToken = params.access_token as string;
  const refreshToken = params.refresh_token as string;
  const expiresIn = parseInt(params.expires_in as string || "3600", 10);

  if (!accessToken) {
    console.error("No access token in callback");
    return null;
  }

  const tokenData: TokenData = {
    accessToken,
    refreshToken: refreshToken || "",
    expiresAt: Date.now() + expiresIn * 1000,
  };

  // Save tokens
  await saveTokens(tokenData);

  // Fetch and save user info
  try {
    const userInfo = await fetchUserInfo(accessToken);
    await saveUserInfo(userInfo);
  } catch (error) {
    console.error("Failed to fetch user info:", error);
  }

  return tokenData;
}

/**
 * Refresh the access token using the Vercel backend
 */
export async function refreshAccessToken(): Promise<TokenData | null> {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    console.log("No refresh token available");
    return null;
  }

  try {
    const response = await fetch(`${AUTH_SERVER_URL}/api/refresh?refresh_token=${encodeURIComponent(refreshToken)}`);
    const data = await response.json();

    if (data.error) {
      console.error("Token refresh error:", data.error);
      return null;
    }

    const tokenData: TokenData = {
      accessToken: data.access_token,
      refreshToken,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    };

    await saveTokens(tokenData);
    return tokenData;
  } catch (error) {
    console.error("Failed to refresh token:", error);
    return null;
  }
}

/**
 * Get a valid access token (refreshes if expired)
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await getTokens();

  if (!tokens) {
    console.log("No tokens found in storage");
    return null;
  }

  if (await isTokenExpired()) {
    console.log("Token expired, attempting refresh...");
    const newTokens = await refreshAccessToken();
    return newTokens?.accessToken ?? null;
  }

  console.log("Using stored access token");
  return tokens.accessToken;
}

/**
 * Fetch user info from Google
 */
export async function fetchUserInfo(accessToken: string): Promise<UserInfo> {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch user info");
  }

  const data = await response.json();

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    picture: data.picture,
  };
}

/**
 * Sign out the user
 */
export async function signOut(): Promise<void> {
  const tokens = await getTokens();

  // Revoke token if available
  if (tokens?.accessToken) {
    try {
      await AuthSession.revokeAsync({ token: tokens.accessToken }, discovery);
    } catch (error) {
      console.error("Failed to revoke token:", error);
    }
  }

  // Clear stored auth data
  await clearAuthData();
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const tokens = await getTokens();
  return tokens !== null;
}
