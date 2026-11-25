export interface ImageUploadItem {
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  message: string;
}
export interface UploadResponse {
  message: string;
  filePath: string;
}
