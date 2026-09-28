// Google Drive v3 REST Client Service
// Client-side authentication using in-memory bearer access token

import { getAccessToken } from './googleWorkspaceAuth';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
}

/**
 * List files in Google Drive (recent files, menu exports, reports)
 */
export async function listDriveFiles(pageSize: number = 20): Promise<DriveFileItem[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Workspace authentication required. Please connect your Google Account.');
  }

  const queryParams = new URLSearchParams({
    pageSize: String(pageSize),
    fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink)',
    orderBy: 'modifiedTime desc',
    q: "trashed = false"
  });

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${queryParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Google Drive API error: ${response.status}`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Upload a document or JSON report directly to Google Drive
 */
export async function uploadReportToDrive(
  fileName: string,
  content: string,
  mimeType: string = 'text/plain'
): Promise<DriveFileItem> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Workspace authentication required.');
  }

  const metadata = {
    name: fileName,
    mimeType
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([content], { type: mimeType }));

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: form
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to upload to Google Drive: ${response.status}`);
  }

  return await response.json();
}

/**
 * Delete a file from Google Drive (Requires prior user confirmation)
 */
export async function deleteDriveFile(fileId: string, confirmed: boolean): Promise<boolean> {
  if (!confirmed) {
    throw new Error('Action aborted: User confirmation is mandatory for deleting Google Drive files.');
  }

  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Workspace authentication required.');
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok && response.status !== 204) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to delete file from Google Drive`);
  }

  return true;
}
