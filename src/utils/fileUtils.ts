import { Alert, Linking } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL } from '../services/api';

/**
 * Downloads a remote file to the device's cache and opens it via the system
 * share sheet (expo-sharing). Falls back to Linking.openURL when sharing is
 * unavailable (e.g. Expo Go simulator).
 *
 * This version uses 'expo-file-system/legacy' to avoid the deprecation warning
 * for createDownloadResumable in Expo 54+.
 *
 * @param url      Remote URL of the file (PDF, image, etc.)
 * @param fileName Suggested filename (e.g. "Term_1_Schedule.pdf")
 */
export const downloadAndPreviewPDF = async (url: string, fileName: string): Promise<void> => {
  if (!url) {
    Alert.alert('No Document', 'This document is not available yet.');
    return;
  }

  // Sanitise filename
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Use the universal uploads-proxy to ensure reliable cross-platform downloads
  // This bypasses CORS, 401s, and device-specific network restrictions
  const safeBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0,-1) : API_BASE_URL;
  
  // v4: Universal proxy wrap for ALL remote URLs (Supabase/Cloudinary/etc)
  const absoluteUrl = `${safeBase}/uploads-proxy?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(safeFileName)}`;
  console.log(`[DEBUG-FILE] Using Universal Proxy: ${absoluteUrl}`);
  const localUri = FileSystem.cacheDirectory + safeFileName;

  try {
    // ── Step 1: Download via legacy API (no warning) ─────────────────────────
    const downloadResumable = FileSystem.createDownloadResumable(
      absoluteUrl,
      localUri,
      {},
      undefined
    );

    const result = await downloadResumable.downloadAsync();

    if (!result || result.status < 200 || result.status >= 300) {
      console.error(`[DEBUG-FILE] Download failed with status: ${result?.status ?? 'unknown'}`);
      throw new Error(`Server responded with status ${result?.status ?? 'unknown'}`);
    }

    // ── Step 2: Open via system share sheet ──────────────────────────────────
    const isSharingAvailable = await Sharing.isAvailableAsync();

    if (isSharingAvailable) {
      await Sharing.shareAsync(result.uri, {
        mimeType: getMimeType(safeFileName),
        dialogTitle: `Open ${safeFileName}`,
        UTI: getUTI(safeFileName),
      });
    } else {
      // Fallback: open in system browser
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot Open', `Unable to open "${fileName}".`);
      }
    }
  } catch (error: any) {
    console.error('[fileUtils] Download/open error:', error);

    // Fallback to browser
    try {
      const canOpen = await Linking.canOpenURL(absoluteUrl);
      if (canOpen) {
        await Linking.openURL(absoluteUrl);
        return;
      }
    } catch (_) { /* ignore */ }

    Alert.alert(
      'Download Failed',
      'Could not download the document. Please check your internet connection.'
    );
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':  return 'application/pdf';
    case 'png':  return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default:     return 'application/octet-stream';
  }
}

function getUTI(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':  return 'com.adobe.pdf';
    case 'png':  return 'public.png';
    case 'jpg':
    case 'jpeg': return 'public.jpeg';
    default:     return 'public.data';
  }
}
