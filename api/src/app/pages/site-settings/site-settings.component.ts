import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { NbToastrService } from '@nebular/theme';
import { SettingsService, SiteSetting } from '../../@core/services/settings.service';

interface SettingField {
  key: string;
  label: string;
  valueType: 'text' | 'email' | 'phone' | 'url' | 'textarea';
  category: 'contact' | 'company' | 'social' | 'general';
  placeholder?: string;
  icon?: string;
  description?: string;
  isPublic?: boolean;
}

@Component({
  selector: 'ngx-site-settings',
  templateUrl: './site-settings.component.html',
  styleUrls: ['./site-settings.component.scss'],
})
export class SiteSettingsComponent implements OnInit {
  loading = true;
  saving = false;
  
  contactForm: FormGroup;
  companyForm: FormGroup;
  socialForm: FormGroup;
  generalForm: FormGroup;
  
  // İletişim Bilgileri (contact category)
  contactFields: SettingField[] = [
    { key: 'contact_email', label: 'İletişim E-posta', valueType: 'email', category: 'contact', placeholder: 'info@birebiro.com', icon: 'email-outline', description: 'Genel iletişim e-posta adresi', isPublic: true },
    { key: 'support_email', label: 'Destek E-posta', valueType: 'email', category: 'contact', placeholder: 'destek@birebiro.com', icon: 'email-outline', description: 'Müşteri destek e-posta adresi', isPublic: true },
    { key: 'contact_phone', label: 'Telefon', valueType: 'phone', category: 'contact', placeholder: '+90 555 123 45 67', icon: 'phone-outline', description: 'İletişim telefon numarası', isPublic: true },
    { key: 'whatsapp_number', label: 'WhatsApp', valueType: 'phone', category: 'contact', placeholder: '+90 555 123 45 67', icon: 'message-circle-outline', description: 'WhatsApp iletişim numarası', isPublic: true },
    { key: 'business_hours_weekdays', label: 'Hafta İçi Çalışma Saatleri', valueType: 'text', category: 'contact', placeholder: '09:00 - 18:00', icon: 'clock-outline', description: 'Pazartesi-Cuma çalışma saatleri', isPublic: true },
    { key: 'business_hours_weekend', label: 'Hafta Sonu Çalışma Saatleri', valueType: 'text', category: 'contact', placeholder: '10:00 - 16:00', icon: 'clock-outline', description: 'Cumartesi-Pazar çalışma saatleri', isPublic: true },
  ];

  // Şirket Bilgileri (company category)
  companyFields: SettingField[] = [
    { key: 'company_name', label: 'Şirket Adı', valueType: 'text', category: 'company', placeholder: 'Birebiro', icon: 'briefcase-outline', description: 'Marka adı', isPublic: true },
    { key: 'company_legal_name', label: 'Şirket Ünvanı', valueType: 'text', category: 'company', placeholder: 'Birebiro Teknoloji A.Ş.', icon: 'file-text-outline', description: 'Resmi şirket ünvanı', isPublic: true },
    { key: 'company_address', label: 'Adres', valueType: 'textarea', category: 'company', placeholder: 'Maslak Mahallesi, Büyükdere Caddesi No: 123...', icon: 'pin-outline', description: 'Şirket adresi', isPublic: true },
    { key: 'company_tax_office', label: 'Vergi Dairesi', valueType: 'text', category: 'company', placeholder: 'Maslak Vergi Dairesi', icon: 'home-outline', description: 'Vergi dairesi adı', isPublic: false },
    { key: 'company_tax_number', label: 'Vergi No', valueType: 'text', category: 'company', placeholder: '1234567890', icon: 'hash-outline', description: 'Vergi kimlik numarası', isPublic: false },
  ];

  // Sosyal Medya (social category)
  socialFields: SettingField[] = [
    { key: 'social_instagram', label: 'Instagram', valueType: 'url', category: 'social', placeholder: 'https://instagram.com/birebiro', icon: 'camera-outline', isPublic: true },
    { key: 'social_twitter', label: 'Twitter/X', valueType: 'url', category: 'social', placeholder: 'https://twitter.com/birebiro', icon: 'twitter-outline', isPublic: true },
    { key: 'social_facebook', label: 'Facebook', valueType: 'url', category: 'social', placeholder: 'https://facebook.com/birebiro', icon: 'facebook-outline', isPublic: true },
    { key: 'social_linkedin', label: 'LinkedIn', valueType: 'url', category: 'social', placeholder: 'https://linkedin.com/company/birebiro', icon: 'linkedin-outline', isPublic: true },
    { key: 'social_youtube', label: 'YouTube', valueType: 'url', category: 'social', placeholder: 'https://youtube.com/@birebiro', icon: 'play-circle-outline', isPublic: true },
    { key: 'social_tiktok', label: 'TikTok', valueType: 'url', category: 'social', placeholder: 'https://tiktok.com/@birebiro', icon: 'video-outline', isPublic: true },
  ];

  // Genel Ayarlar (general category)
  generalFields: SettingField[] = [
    { key: 'site_name', label: 'Site Adı', valueType: 'text', category: 'general', placeholder: 'Birebiro', icon: 'globe-outline', description: 'Web sitesi başlığı', isPublic: true },
    { key: 'site_description', label: 'Site Açıklaması', valueType: 'textarea', category: 'general', placeholder: 'Yapay zeka destekli kişisel sanat eserleri', icon: 'file-text-outline', description: 'SEO açıklaması', isPublic: true },
    { key: 'copyright_text', label: 'Copyright', valueType: 'text', category: 'general', placeholder: '© 2025 Birebiro. Tüm hakları saklıdır.', icon: 'shield-outline', description: 'Footer copyright metni', isPublic: true },
  ];

  constructor(
    private fb: FormBuilder,
    private settingsService: SettingsService,
    private toastrService: NbToastrService,
  ) {
    this.initForms();
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  initForms(): void {
    // Contact form
    const contactControls: { [key: string]: string } = {};
    this.contactFields.forEach(field => {
      contactControls[field.key] = '';
    });
    this.contactForm = this.fb.group(contactControls);

    // Company form
    const companyControls: { [key: string]: string } = {};
    this.companyFields.forEach(field => {
      companyControls[field.key] = '';
    });
    this.companyForm = this.fb.group(companyControls);

    // Social form
    const socialControls: { [key: string]: string } = {};
    this.socialFields.forEach(field => {
      socialControls[field.key] = '';
    });
    this.socialForm = this.fb.group(socialControls);

    // General form
    const generalControls: { [key: string]: string } = {};
    this.generalFields.forEach(field => {
      generalControls[field.key] = '';
    });
    this.generalForm = this.fb.group(generalControls);
  }

  loadSettings(): void {
    this.loading = true;
    this.settingsService.getAllSiteSettings().subscribe({
      next: (settings) => {
        settings.forEach(setting => {
          if (this.contactForm.get(setting.key)) {
            this.contactForm.patchValue({ [setting.key]: setting.value || '' });
          }
          if (this.companyForm.get(setting.key)) {
            this.companyForm.patchValue({ [setting.key]: setting.value || '' });
          }
          if (this.socialForm.get(setting.key)) {
            this.socialForm.patchValue({ [setting.key]: setting.value || '' });
          }
          if (this.generalForm.get(setting.key)) {
            this.generalForm.patchValue({ [setting.key]: setting.value || '' });
          }
        });
        this.loading = false;
      },
      error: (error) => {
        console.error('Settings load error:', error);
        this.toastrService.danger('Ayarlar yüklenirken hata oluştu', 'Hata');
        this.loading = false;
      },
    });
  }

  saveContactSettings(): void {
    this.saving = true;
    const settings: SiteSetting[] = this.contactFields.map(field => ({
      key: field.key,
      value: this.contactForm.get(field.key)?.value || '',
      valueType: field.valueType,
      category: field.category,
      label: field.label,
      isPublic: field.isPublic ?? true,
    }));

    this.settingsService.bulkUpdateSiteSettings(settings).subscribe({
      next: () => {
        this.toastrService.success('İletişim ayarları kaydedildi', 'Başarılı');
        this.saving = false;
      },
      error: (error) => {
        console.error('Save error:', error);
        this.toastrService.danger('Kayıt sırasında hata oluştu', 'Hata');
        this.saving = false;
      },
    });
  }

  saveCompanySettings(): void {
    this.saving = true;
    const settings: SiteSetting[] = this.companyFields.map(field => ({
      key: field.key,
      value: this.companyForm.get(field.key)?.value || '',
      valueType: field.valueType,
      category: field.category,
      label: field.label,
      isPublic: field.isPublic ?? true,
    }));

    this.settingsService.bulkUpdateSiteSettings(settings).subscribe({
      next: () => {
        this.toastrService.success('Şirket bilgileri kaydedildi', 'Başarılı');
        this.saving = false;
      },
      error: (error) => {
        console.error('Save error:', error);
        this.toastrService.danger('Kayıt sırasında hata oluştu', 'Hata');
        this.saving = false;
      },
    });
  }

  saveSocialSettings(): void {
    this.saving = true;
    const settings: SiteSetting[] = this.socialFields.map(field => ({
      key: field.key,
      value: this.socialForm.get(field.key)?.value || '',
      valueType: field.valueType,
      category: field.category,
      label: field.label,
      isPublic: field.isPublic ?? true,
    }));

    this.settingsService.bulkUpdateSiteSettings(settings).subscribe({
      next: () => {
        this.toastrService.success('Sosyal medya ayarları kaydedildi', 'Başarılı');
        this.saving = false;
      },
      error: (error) => {
        console.error('Save error:', error);
        this.toastrService.danger('Kayıt sırasında hata oluştu', 'Hata');
        this.saving = false;
      },
    });
  }

  saveGeneralSettings(): void {
    this.saving = true;
    const settings: SiteSetting[] = this.generalFields.map(field => ({
      key: field.key,
      value: this.generalForm.get(field.key)?.value || '',
      valueType: field.valueType,
      category: field.category,
      label: field.label,
      isPublic: field.isPublic ?? true,
    }));

    this.settingsService.bulkUpdateSiteSettings(settings).subscribe({
      next: () => {
        this.toastrService.success('Genel ayarlar kaydedildi', 'Başarılı');
        this.saving = false;
      },
      error: (error) => {
        console.error('Save error:', error);
        this.toastrService.danger('Kayıt sırasında hata oluştu', 'Hata');
        this.saving = false;
      },
    });
  }

  saveAllSettings(): void {
    this.saving = true;
    const allSettings: SiteSetting[] = [
      ...this.contactFields.map(field => ({
        key: field.key,
        value: this.contactForm.get(field.key)?.value || '',
        valueType: field.valueType,
        category: field.category,
        label: field.label,
        isPublic: field.isPublic ?? true,
      })),
      ...this.companyFields.map(field => ({
        key: field.key,
        value: this.companyForm.get(field.key)?.value || '',
        valueType: field.valueType,
        category: field.category,
        label: field.label,
        isPublic: field.isPublic ?? true,
      })),
      ...this.socialFields.map(field => ({
        key: field.key,
        value: this.socialForm.get(field.key)?.value || '',
        valueType: field.valueType,
        category: field.category,
        label: field.label,
        isPublic: field.isPublic ?? true,
      })),
      ...this.generalFields.map(field => ({
        key: field.key,
        value: this.generalForm.get(field.key)?.value || '',
        valueType: field.valueType,
        category: field.category,
        label: field.label,
        isPublic: field.isPublic ?? true,
      })),
    ];

    this.settingsService.bulkUpdateSiteSettings(allSettings).subscribe({
      next: () => {
        this.toastrService.success('Tüm ayarlar kaydedildi', 'Başarılı');
        this.saving = false;
      },
      error: (error) => {
        console.error('Save error:', error);
        this.toastrService.danger('Kayıt sırasında hata oluştu', 'Hata');
        this.saving = false;
      },
    });
  }
}
