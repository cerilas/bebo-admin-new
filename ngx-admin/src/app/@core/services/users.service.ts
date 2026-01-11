import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { User, UserDetail } from '../models';

@Injectable({
  providedIn: 'root',
})
export class UsersService extends BaseApiService {
  private endpoint = '/users';

  getAll(): Observable<User[]> {
    return this.get<User[]>(this.endpoint);
  }

  getUsers(): Observable<User[]> {
    return this.get<User[]>(this.endpoint);
  }

  getUser(id: string): Observable<UserDetail> {
    return this.get<UserDetail>(`${this.endpoint}/${id}`);
  }

  updateUserCredits(id: string, credits: number): Observable<User> {
    return this.patch<User>(`${this.endpoint}/${id}/credits`, { artCredits: credits });
  }

  getUserStatistics(): Observable<{
    totalUsers: number;
    newUsersThisMonth: number;
    totalCreditsUsed: number;
  }> {
    return this.get(`${this.endpoint}/statistics`);
  }
}
