import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  private apiUrl = 'http://localhost:8080/upload-image';

  constructor(private http: HttpClient) {}

  uploadImage(formData: FormData): Observable<{ message: string; filePath: string }> {
    return this.http.post<{ message: string; filePath: string }>(this.apiUrl, formData);
  }
}
