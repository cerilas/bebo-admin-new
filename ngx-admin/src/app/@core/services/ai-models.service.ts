import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AIModel } from '../models/ai-model.model';

@Injectable({
    providedIn: 'root',
})
export class AIModelsService {
    private readonly apiUrl = `${environment.apiUrl}/ai-models`;

    constructor(private http: HttpClient) { }

    getAIModels(): Observable<AIModel[]> {
        return this.http.get<AIModel[]>(this.apiUrl);
    }

    createAIModel(model: AIModel): Observable<any> {
        return this.http.post(this.apiUrl, model);
    }

    updateAIModel(id: number, model: Partial<AIModel>): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}`, model);
    }

    deleteAIModel(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }

    reorderModels(modelIds: number[]): Observable<any> {
        return this.http.post(`${this.apiUrl}/reorder`, { modelIds });
    }
}
