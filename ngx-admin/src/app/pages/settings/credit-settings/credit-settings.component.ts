import { Component, OnInit } from '@angular/core';
import { SettingsService } from '../../../@core/services';
import { ArtCreditSettings } from '../../../@core/models';

@Component({
  selector: 'ngx-credit-settings',
  templateUrl: './credit-settings.component.html',
  styleUrls: ['./credit-settings.component.scss'],
})
export class CreditSettingsComponent implements OnInit {
  settings: ArtCreditSettings = {
    id: null,
    pricePerCredit: 100,
    isActive: true,
    minPurchase: 1,
    maxPurchase: 1000,
  };
  loading = true;
  saving = false;
  saved = false;
  error: string = null;

  constructor(private settingsService: SettingsService) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading = true;
    this.error = null;
    this.settingsService.getCreditSettings().subscribe({
      next: (settings) => {
        this.settings = settings;
        this.loading = false;
      },
      error: (error) => {
        console.error('Ayarlar yüklenirken hata:', error);
        this.error = 'Ayarlar yüklenirken hata oluştu.';
        this.loading = false;
      },
    });
  }

  saveSettings(): void {
    this.saving = true;
    this.saved = false;
    this.error = null;

    this.settingsService.updateCreditSettings(this.settings).subscribe({
      next: (response) => {
        this.settings = response.data;
        this.saving = false;
        this.saved = true;
        setTimeout(() => this.saved = false, 3000);
      },
      error: (error) => {
        console.error('Ayarlar kaydedilirken hata:', error);
        this.error = 'Ayarlar kaydedilirken hata oluştu.';
        this.saving = false;
      },
    });
  }

  // Kredi fiyatı TL olarak (kuruştan TL'ye)
  get priceInTL(): number {
    return this.settings.pricePerCredit / 100;
  }

  set priceInTL(value: number) {
    this.settings.pricePerCredit = Math.round(value * 100);
  }
}
