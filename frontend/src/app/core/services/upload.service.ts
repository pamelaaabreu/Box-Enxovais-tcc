import type { UploadResponse } from '../../shared/types/products/image-upload';
import { API_BASE_URL, apiEndpoint } from '../config/api.config';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  private readonly baseUrl = inject(API_BASE_URL).replace(/\/+$/, '');
  private apiUrl = apiEndpoint(this.baseUrl, 'upload-image');

  constructor(private http: HttpClient) {}

  uploadImage(formData: FormData): Observable<UploadResponse> {
    return this.http.post<UploadResponse>(this.apiUrl, formData);
  }
}
