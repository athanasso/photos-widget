/**
 * Google Photos Picker API Service
 * Uses the new Photos Picker API for user-selected photo access
 */

import * as WebBrowser from "expo-web-browser";
import { getValidAccessToken } from "./google-auth";

const PHOTOS_PICKER_API_BASE = "https://photospicker.googleapis.com/v1";

export interface MediaItem {
  id: string;
  baseUrl: string;
  mimeType: string;
  createTime: string;
  type: "PHOTO" | "VIDEO";
  mediaFile: {
    baseUrl: string;
    mimeType: string;
    filename: string;
  };
}

export interface PickerSession {
  id: string;
  pickerUri: string;
  pollingConfig: {
    pollInterval: string;
    timeoutIn: string;
  };
  expireTime: string;
  mediaItemsSet: boolean;
}

export interface MediaItemsResponse {
  mediaItems?: MediaItem[];
  nextPageToken?: string;
}

/**
 * Create a new picker session
 * Returns a URI that the user should visit to select photos
 */
export async function createPickerSession(): Promise<PickerSession> {
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${PHOTOS_PICKER_API_BASE}/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create picker session: ${error}`);
  }

  return response.json();
}

/**
 * Get the status of a picker session
 */
export async function getPickerSession(sessionId: string): Promise<PickerSession> {
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${PHOTOS_PICKER_API_BASE}/sessions/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get picker session: ${error}`);
  }

  return response.json();
}

/**
 * Delete a picker session
 */
export async function deletePickerSession(sessionId: string): Promise<void> {
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  await fetch(`${PHOTOS_PICKER_API_BASE}/sessions/${sessionId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Fetch media items from the picker session
 * Can only be called after user has selected photos (mediaItemsSet = true)
 */
export async function fetchPickerMediaItems(
  sessionId: string,
  pageSize: number = 50,
  pageToken?: string,
): Promise<MediaItemsResponse> {
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  const params = new URLSearchParams({
    sessionId,
    pageSize: pageSize.toString(),
  });

  if (pageToken) {
    params.append("pageToken", pageToken);
  }

  const response = await fetch(
    `${PHOTOS_PICKER_API_BASE}/mediaItems?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch picker media items: ${error}`);
  }

  return response.json();
}

/**
 * Open the photo picker in the browser
 * Returns after the user closes the browser
 */
export async function openPhotoPicker(): Promise<string | null> {
  try {
    // Create a new session
    const session = await createPickerSession();
    console.log("Created picker session:", session.id);
    console.log("Picker URI:", session.pickerUri);

    // Open the picker in browser
    await WebBrowser.openBrowserAsync(session.pickerUri, {
      showInRecents: true,
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    });

    // Return the session ID so we can poll for completion
    return session.id;
  } catch (error) {
    console.error("Error opening photo picker:", error);
    throw error;
  }
}

/**
 * Poll the session until user has selected photos
 */
export async function waitForPhotoSelection(sessionId: string): Promise<boolean> {
  const maxAttempts = 60; // 5 minutes max (5 second intervals)
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const session = await getPickerSession(sessionId);
      
      if (session.mediaItemsSet) {
        console.log("User has selected photos!");
        return true;
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    } catch (error) {
      console.error("Error polling session:", error);
      return false;
    }
  }

  console.log("Timed out waiting for photo selection");
  return false;
}

/**
 * Complete flow: Open picker, wait for selection, get photos
 */
export async function pickPhotos(): Promise<MediaItem[]> {
  // Create session and open picker
  const sessionId = await openPhotoPicker();
  
  if (!sessionId) {
    throw new Error("Failed to create picker session");
  }

  // Wait a moment for the browser to close, then start polling
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Poll for completion
  const hasSelection = await waitForPhotoSelection(sessionId);

  if (!hasSelection) {
    await deletePickerSession(sessionId);
    return [];
  }

  // Fetch the selected photos
  const response = await fetchPickerMediaItems(sessionId);
  
  // Clean up the session
  await deletePickerSession(sessionId);

  return response.mediaItems || [];
}

/**
 * Get image URL with specified dimensions
 */
export function getImageUrl(
  baseUrl: string,
  options: { width?: number; height?: number; crop?: boolean } = {},
): string {
  const { width, height, crop } = options;
  let url = baseUrl;
  const params: string[] = [];

  if (width) params.push(`w${width}`);
  if (height) params.push(`h${height}`);
  if (crop) params.push("c");

  if (params.length > 0) {
    url = `${baseUrl}=${params.join("-")}`;
  }

  return url;
}

/**
 * Get thumbnail URL for a media item
 */
export function getThumbnailUrl(baseUrl: string, size: number = 256): string {
  return getImageUrl(baseUrl, { width: size, height: size, crop: true });
}
