import { NbMenuItem } from '@nebular/theme';

export const MENU_ITEMS: NbMenuItem[] = [
  {
    title: 'Genel Bakış',
    icon: 'home-outline',
    link: '/pages/dashboard',
    home: true,
  },
  {
    title: 'YÖNETİM',
    group: true,
  },
  {
    title: 'Siparişler',
    icon: 'shopping-cart-outline',
    link: '/pages/orders',
  },
  {
    title: 'Ürünler',
    icon: 'cube-outline',
    children: [
      {
        title: 'Ürün Listesi',
        link: '/pages/products/list',
      },
      {
        title: 'Yeni Ürün',
        link: '/pages/products/create',
      },
    ],
  },
  {
    title: 'Kullanıcılar',
    icon: 'people-outline',
    link: '/pages/users',
  },
  {
    title: 'Oluşturulan Görseller',
    icon: 'image-outline',
    link: '/pages/generated-images',
  },
  {
    title: 'İLETİŞİM',
    group: true,
  },
  {
    title: 'İletişim Formları',
    icon: 'email-outline',
    link: '/pages/contact-submissions',
  },
  {
    title: 'Bülten Aboneleri',
    icon: 'bell-outline',
    link: '/pages/newsletter',
  },
  {
    title: 'AYARLAR',
    group: true,
  },
  {
    title: 'Site Ayarları',
    icon: 'globe-outline',
    link: '/pages/site-settings',
  },
  {
    title: 'Yasal Metinler',
    icon: 'file-text-outline',
    link: '/pages/legal-documents',
  },
  {
    title: 'Kredi Ayarları',
    icon: 'settings-outline',
    link: '/pages/settings/credit',
  },
  {
    title: 'Hakkımızda Ayarları',
    icon: 'info-outline',
    link: '/pages/settings/about',
  },
  {
    title: 'Yapay Zeka Ayarları',
    icon: 'browser-outline',
    link: '/pages/settings/ai',
  },
];
