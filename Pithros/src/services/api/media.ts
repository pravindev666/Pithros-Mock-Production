/**
 * Media upload pipeline.
 *
 * The browser PUTs the file straight to object storage using a short-lived
 * URL minted by the API; the file never passes through the application server.
 * Only after the transfer completes and the server has verified the stored bytes
 * does a media record become usable.
 */

import type { MediaItem } from '../../types';
import { http } from './client';

interface UploadIntent {
  mediaId: string;
  uploadUrl: string;
  method: string;
  headers: Record<string, string>;
  expiresIn: number;
  maxBytes: number;
}

interface UploadComplete {
  mediaId: string;
  status: string;
  kind: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  thumbnailPending: boolean;
}

export class UploadRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadRejectedError';
  }
}

async function putToStorage(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress?: (percent: number) => void,
): Promise<void> {
  // XMLHttpRequest rather than fetch: it is the only way to observe upload
  // progress, which the uploader UI shows.
  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', url, true);

    for (const [key, value] of Object.entries(headers)) {
      request.setRequestHeader(key, value);
    }

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new UploadRejectedError(`Storage rejected the upload (${request.status}).`));
    };
    request.onerror = () => reject(new UploadRejectedError('The upload could not be completed.'));
    request.onabort = () => reject(new UploadRejectedError('The upload was cancelled.'));

    request.send(file);
  });
}

export const mediaApi = {
  async uploadFile(
    memorialId: string,
    file: File,
    options: {
      kind?: MediaItem['type'];
      title?: string;
      caption?: string;
      year?: string;
      onProgress?: (percent: number) => void;
    } = {},
  ): Promise<UploadComplete> {
    const intent = await http.post<UploadIntent>(`/memorials/${memorialId}/media/upload-intent`, {
      filename: file.name,
      contentType: file.type || undefined,
      sizeBytes: file.size,
      kind: options.kind ?? 'photo',
      title: options.title ?? file.name,
      caption: options.caption,
      year: options.year,
    });

    await putToStorage(intent.uploadUrl, file, intent.headers, options.onProgress);

    return http.post<UploadComplete>(`/memorials/${memorialId}/media/${intent.mediaId}/complete`);
  },

  async list(memorialId: string): Promise<MediaItem[]> {
    const items = await http.get<
      Array<{
        id: string;
        type: string;
        title?: string;
        url: string;
        thumbnailUrl?: string | null;
        caption?: string | null;
        year?: string | null;
        uploadedBy?: string | null;
        isPrivate?: boolean;
        isPublic?: boolean;
      }>
    >(`/memorials/${memorialId}/media`);

    return items.map((item) => ({
      id: item.id,
      type: item.type as MediaItem['type'],
      title: item.title ?? '',
      url: item.url,
      thumbnailUrl: item.thumbnailUrl ?? undefined,
      caption: item.caption ?? undefined,
      year: item.year ?? undefined,
      uploadedBy: item.uploadedBy ?? undefined,
      isPrivate: item.isPrivate,
      isPublic: item.isPublic,
    }));
  },

  async remove(memorialId: string, mediaId: string): Promise<void> {
    await http.delete<void>(`/memorials/${memorialId}/media/${mediaId}`);
  },

  async update(
    memorialId: string,
    mediaId: string,
    updates: Partial<Pick<MediaItem, 'title' | 'caption' | 'year'>>,
  ): Promise<void> {
    await http.patch(`/memorials/${memorialId}/media/${mediaId}`, updates);
  },
};
