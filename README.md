# 🎨 Birebiro Admin Panel

Modern admin panel uygulaması - AI sanat platformu yönetimi için.

## 📋 Proje Yapısı

```
birebiro-new-admin/
├── api/                    # Backend (Express.js + PostgreSQL)
│   └── server.js
├── ngx-admin/             # Frontend (Angular + Nebular)
│   ├── src/
│   └── package.json
├── start.sh               # Her iki servisi başlatma scripti
└── package.json           # Root package.json
```

## 🚀 Hızlı Başlangıç

### Yöntem 1: Script ile (Önerilen)

```bash
# Proje dizinine git
cd birebiro-new-admin

# Her iki servisi de başlat
./start.sh
```

### Yöntem 2: npm ile

```bash
cd birebiro-new-admin
npm start
```

### Yöntem 3: Manuel (Ayrı terminaller)

**Terminal 1 - Backend:**
```bash
cd birebiro-new-admin/api
node server.js
```

**Terminal 2 - Frontend:**
```bash
cd birebiro-new-admin/ngx-admin
npm start
```

## 🔗 Erişim URL'leri

| Servis | URL | Port |
|--------|-----|------|
| Frontend (Angular) | http://localhost:4200 | 4200 |
| Backend API | http://localhost:3000 | 3000 |
| Health Check | http://localhost:3000/api/health | 3000 |

## 📦 Kurulum

### Backend (API)
```bash
cd api
npm install
```

### Frontend (Angular)
```bash
cd ngx-admin
npm install --legacy-peer-deps
```

## 🛠️ Teknolojiler

### Backend
- **Runtime:** Node.js v24.9.0
- **Framework:** Express.js 4.18.2
- **Database:** PostgreSQL (Railway)
- **ORM:** pg 8.11.3

### Frontend
- **Framework:** Angular 15.2.10
- **UI Library:** Nebular Theme 11.0.1
- **Icons:** Eva Icons
- **HTTP:** RxJS

## 📊 Modüller

- ✅ **Siparişler** - Sipariş yönetimi, detay görüntüleme, kargo takibi
- ✅ **Ürünler** - Ürün CRUD işlemleri
- ✅ **Kullanıcılar** - Kullanıcı listesi ve yönetimi
- ✅ **Oluşturulan Görseller** - AI tarafından oluşturulan görseller
- ✅ **Hakkımızda** - Sayfa içerik yönetimi
- ✅ **Yasal Belgeler** - Gizlilik, kullanım şartları vb.
- ✅ **İletişim** - Form gönderileri
- ✅ **Newsletter** - Abonelik yönetimi
- ✅ **Ayarlar** - Sistem ayarları

## 🎯 Özellikler

### Siparişler Modülü
- 📊 Pagination (sayfalama)
- 🔍 Gelişmiş filtreleme (arama, ödeme durumu, kargo durumu)
- 👁️ Detaylı sipariş görüntüleme
- 📦 Kargo durumu güncelleme
- 📝 Sipariş notları ekleme
- 🎨 Status badge'leri (renkli durum göstergeleri)

## 🔧 Geliştirme

### API Endpoints

```
GET    /api/orders              # Tüm siparişler
GET    /api/orders/:id          # Sipariş detayı
PATCH  /api/orders/:id/shipping # Kargo güncelleme
PATCH  /api/orders/:id/notes    # Not ekleme
GET    /api/products            # Ürün listesi
GET    /api/users               # Kullanıcı listesi
```

## 🐛 Sorun Giderme

### Port kullanımda hatası
```bash
# Port 3000'i kullanan process'i bul ve durdur
lsof -ti:3000 | xargs kill -9

# Port 4200'ü kullanan process'i bul ve durdur
lsof -ti:4200 | xargs kill -9
```

### Database bağlantı hatası
- Railway PostgreSQL bağlantı stringini kontrol edin
- `.env` dosyasında DATABASE_URL'in doğru olduğundan emin olun

### Angular build hatası
```bash
cd ngx-admin
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

## 📝 Notlar

- API varsayılan olarak **port 3000**'de çalışır
- Frontend varsayılan olarak **port 4200**'de çalışır
- Database: Railway PostgreSQL (cloud)
- CORS enabled - frontend'den API'ye erişim sağlanmış

## 👨‍💻 Geliştirici

Birebiro Team - 2025

## 📄 Lisans

ISC
