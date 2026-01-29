import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NbToastrService } from '@nebular/theme';
import { AIModelsService } from '../../../@core/services/ai-models.service';
import { AIModel } from '../../../@core/models/ai-model.model';

@Component({
    selector: 'ngx-ai-settings',
    templateUrl: './ai-settings.component.html',
    styleUrls: ['./ai-settings.component.scss'],
})
export class AiSettingsComponent implements OnInit {
    models: AIModel[] = [];
    loading = false;
    showForm = false;
    editingId: number | null = null;
    modelForm: FormGroup;
    submitting = false;

    constructor(
        private fb: FormBuilder,
        private aiModelsService: AIModelsService,
        private toastrService: NbToastrService
    ) {
        this.modelForm = this.fb.group({
            name: ['', Validators.required],
            provider: ['', Validators.required],
            modelIdentifier: ['', Validators.required],
            isActive: [true],
            sortOrder: [0, Validators.required],
        });
    }

    ngOnInit(): void {
        this.loadModels();
    }

    loadModels(): void {
        this.loading = true;
        this.aiModelsService.getAIModels().subscribe({
            next: (models) => {
                this.models = models;
                this.loading = false;
            },
            error: (error) => {
                console.error('AI models load error:', error);
                this.toastrService.danger('Modeller yüklenemedi', 'Hata');
                this.loading = false;
            },
        });
    }

    addModel(): void {
        this.editingId = null;
        this.modelForm.reset({ isActive: true, sortOrder: this.models.length + 1 });
        this.showForm = true;
    }

    editModel(model: AIModel): void {
        this.editingId = model.id;
        this.modelForm.patchValue(model);
        this.showForm = true;
    }

    cancelEdit(): void {
        this.showForm = false;
        this.editingId = null;
        this.modelForm.reset();
    }

    saveModel(): void {
        if (this.modelForm.invalid) return;

        this.submitting = true;
        const modelData = this.modelForm.value;

        const request = this.editingId
            ? this.aiModelsService.updateAIModel(this.editingId, modelData)
            : this.aiModelsService.createAIModel(modelData);

        request.subscribe({
            next: () => {
                this.toastrService.success(
                    this.editingId ? 'Model güncellendi' : 'Model eklendi',
                    'Başarılı'
                );
                this.loadModels();
                this.cancelEdit();
                this.submitting = false;
            },
            error: (error) => {
                console.error('AI model save error:', error);
                this.toastrService.danger('Model kaydedilemedi', 'Hata');
                this.submitting = false;
            },
        });
    }

    toggleActive(model: AIModel): void {
        this.aiModelsService.updateAIModel(model.id!, { isActive: !model.isActive }).subscribe({
            next: () => {
                this.toastrService.success('Model durumu güncellendi', 'Başarılı');
                this.loadModels();
            },
            error: (error) => {
                console.error('AI model toggle error:', error);
                this.toastrService.danger('Durum güncellenemedi', 'Hata');
            },
        });
    }

    deleteModel(model: AIModel): void {
        if (window.confirm(`${model.name} modelini silmek istediğinize emin misiniz?`)) {
            this.aiModelsService.deleteAIModel(model.id!).subscribe({
                next: () => {
                    this.toastrService.success('Model silindi', 'Başarılı');
                    this.loadModels();
                },
                error: (error) => {
                    console.error('AI model delete error:', error);
                    this.toastrService.danger('Model silinemedi', 'Hata');
                },
            });
        }
    }

    drop(event: CdkDragDrop<AIModel[]>): void {
        moveItemInArray(this.models, event.previousIndex, event.currentIndex);

        // Optimistically update UI and send to backend
        const modelIds = this.models.map(m => m.id!).filter(id => !!id);
        this.aiModelsService.reorderModels(modelIds).subscribe({
            next: () => {
                this.toastrService.success('Sıralama güncellendi', 'Başarılı');
            },
            error: (error) => {
                console.error('AI models reorder error:', error);
                this.toastrService.danger('Sıralama güncellenirken hata oluştu', 'Hata');
                this.loadModels(); // Rollback on error
            },
        });
    }
}
