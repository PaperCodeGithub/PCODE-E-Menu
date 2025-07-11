// src/lib/image-db.ts
import { rtdb } from './firebase';
import { ref, set, get, remove } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';

const IMAGE_PATH = 'menu_images';
const RTDB_PROTOCOL = 'rtdb://';

/**
 * Saves a base64 encoded image to the Firebase Realtime Database.
 * @param base64Data The base64 data URI of the image.
 * @returns A promise that resolves with a unique identifier for the stored image.
 */
export async function saveImageToRTDB(base64Data: string): Promise<string> {
  if (!base64Data.startsWith('data:image')) {
    throw new Error('Invalid image data format. Must be a data URI.');
  }
  const imageId = uuidv4();
  const imageRef = ref(rtdb, `${IMAGE_PATH}/${imageId}`);
  
  try {
    await set(imageRef, { imageData: base64Data });
    return `${RTDB_PROTOCOL}${IMAGE_PATH}/${imageId}`;
  } catch (error) {
    console.error("Failed to save image to Realtime Database:", error);
    throw new Error("Could not save image.");
  }
}

/**
 * Retrieves a base64 encoded image from the Firebase Realtime Database.
 * @param rtdbIdentifier The unique identifier for the image (e.g., 'rtdb://menu_images/some_uuid').
 * @returns A promise that resolves with the base64 data URI of the image, or null if not found.
 */
export async function getImageFromRTDB(rtdbIdentifier: string): Promise<string | null> {
  if (!rtdbIdentifier.startsWith(RTDB_PROTOCOL)) {
    console.warn("Invalid RTDB identifier, returning as is:", rtdbIdentifier);
    // If it's not an rtdb link, maybe it's a regular URL or already a data uri.
    return rtdbIdentifier;
  }
  
  const path = rtdbIdentifier.substring(RTDB_PROTOCOL.length);
  const imageRef = ref(rtdb, path);

  try {
    const snapshot = await get(imageRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return data.imageData; // Assuming the data is stored in an 'imageData' property.
    } else {
      console.warn("No image found at path:", path);
      return null;
    }
  } catch (error) {
    console.error("Failed to retrieve image from Realtime Database:", error);
    throw new Error("Could not retrieve image.");
  }
}

/**
 * Deletes an image from the Firebase Realtime Database.
 * @param rtdbIdentifier The unique identifier for the image to delete.
 */
export async function deleteImageFromRTDB(rtdbIdentifier: string): Promise<void> {
    if (!rtdbIdentifier.startsWith(RTDB_PROTOCOL)) {
        console.warn("Skipping deletion, not an RTDB identifier:", rtdbIdentifier);
        return;
    }
    const path = rtdbIdentifier.substring(RTDB_PROTOCOL.length);
    const imageRef = ref(rtdb, path);

    try {
        await remove(imageRef);
    } catch (error) {
        console.error("Failed to delete image from Realtime Database:", error);
        // Don't throw an error, just log it. Deletion failure is not critical.
    }
}
