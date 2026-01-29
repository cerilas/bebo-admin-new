export interface AIModel {
    id?: number;
    name: string;
    provider: string;
    modelIdentifier: string;
    isActive: boolean;
    sortOrder: number;
    createdAt?: string;
    updatedAt?: string;
}
