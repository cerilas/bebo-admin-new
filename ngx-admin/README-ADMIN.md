# 🎨 Birebiro Admin Panel

Bu proje, [ngx-admin](https://github.com/akveo/ngx-admin) template'i kullanılarak Birebiro uygulaması için özel olarak geliştirilmiş bir admin panelidir.

## 📋 İçindekiler

- [Proje Durumu](#proje-durumu)
- [Teknoloji Stack](#teknoloji-stack)
- [Özellikler](#özellikler)
- [Kurulum](#kurulum)
- [Yapılan İşler](#yapılan-işler)
- [Yapılacak İşler](#yapılacak-işler)
- [Klasör Yapısı](#klasör-yapısı)
- [API Entegrasyonu](#api-entegrasyonu)
- [Deployment](#deployment)

## 🚀 Proje Durumu

**Durum**: 🟡 Aktif Geliştirme  
**Tamamlanma**: ~30%  
**Son Güncelleme**: 29 Kasım 2025

### ✅ Tamamlandı
- Temel yapı ve konfigürasyon
- Data model'leri (TypeScript interfaces)
- Service layer (API servisleri)
- Navigasyon menüsü
- Ürün Yönetimi modülü (temel)

### 🔄 Devam Ediyor
- Ürün modülü için boyut ve çerçeve yönetimi
- Görsel yükleme entegrasyonu
- Diğer CRUD modülleri

## 🛠️ Teknoloji Stack

### Frontend Framework
- **Angular**: v15.2.10
- **Nebular UI**: v11.0.1
- **RxJS**: v6.6.2
- **TypeScript**: Latest

### UI Bileşenleri
- **ng2-smart-table**: Tablo yönetimi
- **ngx-charts**: Grafikler ve istatistikler
- **Eva Icons**: Icon set
- **Bootstrap**: v4.3.1

### Backend
- **Database**: PostgreSQL (Railway)
- **ORM**: Drizzle ORM (ana uygulama ile uyumlu)
- **Connection**: REST API

## ✨ Özellikler

### 🎯 Ana Modüller

1. **Dashboard**
   - Toplam sipariş sayısı
   - Gelir istatistikleri
   - Bekleyen kargolar
   - Yeni kullanıcılar
   - Grafik ve çizelgeler

2. **Sipariş Yönetimi** 
   - Tüm siparişlerin listesi
   - Filtreleme (durum, tarih)
   - Sipariş detayları
   - Kargo takip numarası güncelleme
   - Ödeme durumu görüntüleme
   - Kurumsal fatura bilgileri

3. **Ürün Yönetimi** 
   - Ürün CRUD işlemleri
   - Çoklu dil desteği (TR/EN/FR)
   - Görsel yönetimi (kare/geniş)
   - Boyut yönetimi
   - Çerçeve seçenekleri
   - Aktif/Pasif durumu
   - Sıralama

4. **Kullanıcı Yönetimi**
   - Kullanıcı listesi
   - Kredi bakiyesi görüntüleme
   - Manuel kredi ekleme/çıkarma
   - Kayıt tarihi bilgileri

5. **Oluşturulan Görseller**
   - AI-üretilmiş görsel galerisi
   - Filtreleme (kullanıcı, ürün, tarih)
   - Prompt bilgileri
   - Kredi kullanımı

6. **İçerik Yönetimi**
   - Hakkımızda sayfası düzenleme
   - 3 bölümlü içerik yapısı
   - Misyon ve vizyon
   - Çoklu dil desteği
   - Görsel yönetimi

7. **Yasal Metinler**
   - Gizlilik Politikası
   - Kullanım Koşulları
   - KVKK metni
   - Çoklu dil desteği
   - Rich text editor (CKEditor)

8. **İletişim Yönetimi**
   - Form gönderileri
   - Okundu/Cevaplandı işaretleme
   - Detaylı görüntüleme

9. **Newsletter**
   - Abone listesi
   - Durum yönetimi
   - CSV export

10. **Ayarlar**
    - Kredi fiyatlandırması
    - Min/Max satın alma
    - Genel sistem ayarları

## 📦 Kurulum

### Gereksinimler
- Node.js v14.14 veya üzeri
- npm veya yarn
- PostgreSQL database (Railway)

### Adımlar

1. **Dependencies Yükle**
```bash
cd ngx-admin
npm install
```

2. **Environment Ayarları**
`src/environments/environment.ts` dosyasını kontrol edin:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api', // Backend API URL
  databaseUrl: 'postgresql://postgres:...',
};
```

3. **Development Server Başlat**
```bash
npm start
# veya
ng serve
```

4. **Browser'da Aç**
```
http://localhost:4200
```

## 📁 Klasör Yapısı

```
ngx-admin/
├── src/
│   ├── app/
│   │   ├── @core/
│   │   │   ├── models/           # Data modelleri
│   │   │   │   ├── user.model.ts
│   │   │   │   ├── product.model.ts
│   │   │   │   ├── order.model.ts
│   │   │   │   └── ...
│   │   │   ├── services/         # API servisleri
│   │   │   │   ├── base-api.service.ts
│   │   │   │   ├── products.service.ts
│   │   │   │   ├── orders.service.ts
│   │   │   │   └── ...
│   │   │   └── utils/
│   │   ├── @theme/               # UI tema dosyaları
│   │   ├── pages/
│   │   │   ├── dashboard/
│   │   │   ├── products/         # Ürün modülü
│   │   │   │   ├── product-list/
│   │   │   │   ├── product-form/
│   │   │   │   ├── products.component.ts
│   │   │   │   ├── products.module.ts
│   │   │   │   └── products-routing.module.ts
│   │   │   ├── orders/           # Sipariş modülü (yapılacak)
│   │   │   ├── users/            # Kullanıcı modülü (yapılacak)
│   │   │   └── ...
│   │   └── app.module.ts
│   ├── assets/
│   └── environments/
│       ├── environment.ts
│       └── environment.prod.ts
├── ADMIN-PANEL-PROGRESS.md       # İlerleme raporu
├── SAMPLE-SCHEMA.ts               # Database şeması
└── README-ADMIN.md                # Bu dosya
```

## 🔌 API Entegrasyonu

### Beklenen API Endpoint'leri

Admin panel, aşağıdaki REST API endpoint'lerini kullanmayı beklemektedir:

#### Products
```
GET    /api/products              # Tüm ürünler
POST   /api/products              # Yeni ürün
GET    /api/products/:id          # Tekil ürün
PUT    /api/products/:id          # Ürün güncelle
DELETE /api/products/:id          # Ürün sil

GET    /api/products/:id/sizes    # Ürün boyutları
POST   /api/products/:id/sizes    # Boyut ekle
PUT    /api/products/:id/sizes/:sizeId    # Boyut güncelle
DELETE /api/products/:id/sizes/:sizeId    # Boyut sil

GET    /api/products/:id/frames   # Ürün çerçeveleri
POST   /api/products/:id/frames   # Çerçeve ekle
PUT    /api/products/:id/frames/:frameId  # Çerçeve güncelle
DELETE /api/products/:id/frames/:frameId  # Çerçeve sil
```

#### Orders
```
GET    /api/orders                # Tüm siparişler (filtreleme ile)
GET    /api/orders/:id            # Sipariş detayı
PATCH  /api/orders/:id/shipping   # Kargo durumu güncelle
PATCH  /api/orders/:id/notes      # Admin notu güncelle
GET    /api/orders/statistics     # İstatistikler
```

#### Users
```
GET    /api/users                 # Tüm kullanıcılar
GET    /api/users/:id             # Kullanıcı detayı
PATCH  /api/users/:id/credits     # Kredi güncelle
GET    /api/users/statistics      # Kullanıcı istatistikleri
```

#### Generated Images
```
GET    /api/generated-images      # Tüm görseller (filtreleme ile)
GET    /api/generated-images/:id  # Görsel detayı
GET    /api/generated-images/statistics  # İstatistikler
```

#### Legal Documents
```
GET    /api/legal-documents       # Tüm dökümanlar
POST   /api/legal-documents       # Yeni döküman
GET    /api/legal-documents/:id   # Döküman detayı
PUT    /api/legal-documents/:id   # Döküman güncelle
DELETE /api/legal-documents/:id   # Döküman sil
```

#### About Content
```
GET    /api/about-content?language=tr  # İçerik getir
PUT    /api/about-content/:language    # İçerik güncelle
```

#### Contact Submissions
```
GET    /api/contact-submissions   # Tüm form gönderileri
GET    /api/contact-submissions/:id      # Detay
PATCH  /api/contact-submissions/:id/read    # Okundu işaretle
PATCH  /api/contact-submissions/:id/replied # Cevaplandı işaretle
```

#### Newsletter
```
GET    /api/newsletter-subscribers        # Tüm aboneler
GET    /api/newsletter-subscribers/:id    # Abone detayı
PATCH  /api/newsletter-subscribers/:id/status  # Durum güncelle
GET    /api/newsletter-subscribers/export # CSV export
```

#### Settings
```
GET    /api/art-credit-settings   # Ayarları getir
PUT    /api/art-credit-settings   # Ayarları güncelle
```

### Response Format

Tüm API yanıtları standart JSON formatında olmalıdır:

**Başarılı Yanıt:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Hata Yanıtı:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Hata mesajı"
  }
}
```

## 📊 Database Schema

Detaylı database schema bilgisi için `SAMPLE-SCHEMA.ts` dosyasına bakınız.

### Ana Tablolar

- **users**: Kullanıcı bilgileri ve kredi bakiyesi
- **product**: Ürün ana bilgileri (multi-language)
- **product_size**: Ürün boyut seçenekleri
- **product_frame**: Ürün çerçeve seçenekleri
- **order**: Sipariş bilgileri (PayTR, shipping, invoice)
- **generated_image**: AI-üretilmiş görseller
- **legal_documents**: Yasal metinler
- **about_content**: Hakkımızda sayfası içeriği
- **contact_submissions**: İletişim form kayıtları
- **newsletter_subscribers**: Newsletter aboneleri
- **art_credit_settings**: Kredi ayarları

## 🚀 Deployment

### Production Build

```bash
npm run build:prod
```

Build dosyaları `dist/` klasöründe oluşturulacaktır.

### Environment Variables

Production ortamında `environment.prod.ts` dosyasını güncelleyin:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.birebiro.com/api',
  databaseUrl: 'postgresql://...',
};
```

### Deployment Checklist

- [ ] Environment variables güncellendi
- [ ] API URL production'a yönlendiriliyor
- [ ] Database connection string doğru
- [ ] Auth guard'ları aktif
- [ ] Error tracking eklendi (Sentry vb.)
- [ ] Analytics eklendi
- [ ] SSL sertifikası var
- [ ] CORS ayarları yapıldı

## 🔒 Güvenlik

### Authentication

Admin panel için bir authentication sistemi eklenmelidir:

1. **Auth Guard Ekle**
   - `src/app/@core/guards/auth.guard.ts` oluştur
   - Routes'lara guard ekle

2. **Login Sayfası**
   - Mevcut Nebular Auth modülü kullanılabilir
   - Clerk entegrasyonu yapılabilir

3. **Token Management**
   - JWT token'ları localStorage'da sakla
   - Interceptor ile tüm isteklere ekle

## 📝 Yapılacaklar Listesi

### Yüksek Öncelik
- [ ] Ürün modülünde boyut/çerçeve yönetimi
- [ ] Görsel yükleme komponenti (Cloudinary vb.)
- [ ] Orders modülü oluştur
- [ ] Users modülü oluştur
- [ ] Dashboard istatistikleri

### Orta Öncelik
- [ ] Generated Images galerisi
- [ ] About Content editor
- [ ] Legal Documents CRUD
- [ ] Contact Submissions liste
- [ ] Newsletter yönetimi
- [ ] Settings sayfası

### Düşük Öncelik
- [ ] Auth guard implementasyonu
- [ ] Form validasyonları
- [ ] Error handling iyileştirme
- [ ] Loading states
- [ ] Responsive tasarım kontrolleri
- [ ] Demo içeriklerini kaldır
- [ ] Tests ekle
- [ ] Documentation tamamla

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add some AmazingFeature'`)
4. Branch'inizi push edin (`git push origin feature/AmazingFeature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altındadır. Detaylar için `LICENSE` dosyasına bakınız.

## 🆘 Destek

Sorularınız veya sorunlarınız için:
- GitHub Issues kullanın
- Email: support@birebiro.com

## 📚 Referanslar

- [ngx-admin Documentation](https://akveo.github.io/ngx-admin/)
- [Nebular UI Documentation](https://akveo.github.io/nebular/)
- [Angular Documentation](https://angular.io/docs)
- [ng2-smart-table](https://akveo.github.io/ng2-smart-table/)

---

**Geliştirici Notu**: Bu admin panel aktif geliştirme aşamasındadır. Bazı özellikler henüz tamamlanmamış olabilir. Detaylı ilerleme durumu için `ADMIN-PANEL-PROGRESS.md` dosyasına bakınız.
