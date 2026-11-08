import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  private apiUrl = 'http://localhost:8080/upload-image';

  constructor(private http: HttpClient) {}

  uploadImage(formData: FormData): Observable<any> {
    return this.http.post(this.apiUrl, formData);
  }
}
