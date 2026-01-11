import { Component, OnInit, OnDestroy, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NbThemeService } from '@nebular/theme';
import { takeWhile } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface DashboardStats {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  processingOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  totalUsers: number;
  newUsersLast30Days: number;
  totalGeneratedImages: number;
  imagesLast30Days: number;
  activeProducts: number;
  activeSubscribers: number;
  unreadContacts: number;
}

interface RecentOrder {
  id: number;
  orderNumber: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  userEmail: string;
  userName: string;
}

interface RecentUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  profilePictureUrl: string;
  createdAt: string;
}

interface OrderChartData {
  date: string;
  count: number;
  revenue: number;
}

interface OrdersByStatus {
  status: string;
  count: number;
}

interface TopProduct {
  id: number;
  name: string;
  imageUrl: string;
  orderCount: number;
  totalRevenue: number;
}

@Component({
  selector: 'ngx-dashboard',
  styleUrls: ['./dashboard.component.scss'],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  private alive = true;
  private apiUrl = environment.apiUrl;
  
  loading = true; // Loading state eklendi

  stats: DashboardStats | null = null;
  recentOrders: RecentOrder[] = [];
  recentUsers: RecentUser[] = [];
  ordersChartData: OrderChartData[] = [];
  ordersByStatus: OrdersByStatus[] = [];
  topProducts: TopProduct[] = [];
  
  // Time filter
  selectedPeriod: string = '30';
  periods = [
    { value: '7', label: 'Son 7 Gün' },
    { value: '30', label: 'Son 30 Gün' },
    { value: '90', label: 'Son 90 Gün' },
    { value: 'all', label: 'Tüm Zamanlar' }
  ];
  
  // Chart options
  ordersChartOptions: any = {};
  revenueChartOptions: any = {};
  statusPieOptions: any = {};
  
  themeSubscription: any;
  currentTheme: string = 'default';

  statusLabels: { [key: string]: string } = {
    'pending': 'Beklemede',
    'processing': 'İşleniyor',
    'shipped': 'Kargoda',
    'delivered': 'Teslim Edildi',
    'completed': 'Tamamlandı',
    'success': 'Başarılı',
    'cancelled': 'İptal',
    'refunded': 'İade Edildi',
    'failed': 'Başarısız'
  };

  statusColors: { [key: string]: string } = {
    'pending': '#ffaa00',
    'processing': '#0095ff',
    'shipped': '#8950fc',
    'delivered': '#00d68f',
    'completed': '#00d68f',
    'success': '#00d68f',
    'cancelled': '#ff3d71',
    'refunded': '#ff3d71',
    'failed': '#ff3d71'
  };

  constructor(
    private http: HttpClient,
    private themeService: NbThemeService,
    private cdr: ChangeDetectorRef
  ) {
    // Resize event'i dinle ve chart'ları güncelle
    this.onResize = this.onResize.bind(this);
  }

  private onResize() {
    // Debounce için timeout kullan
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.updateStatusPieChart();
      this.cdr.detectChanges();
    }, 200);
  }
  
  private resizeTimeout: any;

  ngOnInit() {
    // Theme subscription'ı başlat
    this.themeSubscription = this.themeService.getJsTheme()
      .pipe(takeWhile(() => this.alive))
      .subscribe(config => {
        this.currentTheme = config.name;
        this.updateChartTheme(config);
      });
    
    // Resize listener ekle
    window.addEventListener('resize', this.onResize);
  }

  ngAfterViewInit() {
    // View hazır olduktan sonra verileri yükle
    setTimeout(() => {
      this.loadDashboardData();
      this.cdr.detectChanges();
    }, 100);
  }

  ngOnDestroy() {
    this.alive = false;
    window.removeEventListener('resize', this.onResize);
    clearTimeout(this.resizeTimeout);
  }

  onPeriodChange(period: string) {
    this.selectedPeriod = period;
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loading = true;
    const period = this.selectedPeriod;
    let loadedCount = 0;
    const totalRequests = 6;
    
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount >= totalRequests) {
        this.loading = false;
        this.cdr.detectChanges();
      }
    };
    
    // Load stats
    this.http.get<DashboardStats>(`${this.apiUrl}/dashboard/stats?period=${period}`)
      .subscribe({
        next: (data) => {
          this.stats = data;
          checkLoaded();
        },
        error: () => checkLoaded()
      });

    // Load recent orders
    this.http.get<RecentOrder[]>(`${this.apiUrl}/dashboard/recent-orders`)
      .subscribe({
        next: (data) => {
          this.recentOrders = data;
          checkLoaded();
        },
        error: () => checkLoaded()
      });

    // Load recent users
    this.http.get<RecentUser[]>(`${this.apiUrl}/dashboard/recent-users`)
      .subscribe({
        next: (data) => {
          this.recentUsers = data;
          checkLoaded();
        },
        error: () => checkLoaded()
      });

    // Load orders chart data
    this.http.get<OrderChartData[]>(`${this.apiUrl}/dashboard/orders-chart?period=${period}`)
      .subscribe({
        next: (data) => {
          this.ordersChartData = data;
          this.updateOrdersChart();
          checkLoaded();
        },
        error: () => checkLoaded()
      });

    // Load orders by status
    this.http.get<OrdersByStatus[]>(`${this.apiUrl}/dashboard/orders-by-status?period=${period}`)
      .subscribe({
        next: (data) => {
          this.ordersByStatus = data;
          this.updateStatusPieChart();
          checkLoaded();
        },
        error: () => checkLoaded()
      });

    // Load top products
    this.http.get<TopProduct[]>(`${this.apiUrl}/dashboard/top-products?period=${period}`)
      .subscribe({
        next: (data) => {
          this.topProducts = data;
          checkLoaded();
        },
        error: () => checkLoaded()
      });
  }

  updateChartTheme(config: any) {
    this.updateOrdersChart();
    this.updateStatusPieChart();
  }

  updateOrdersChart() {
    const dates = this.ordersChartData.map(d => {
      const date = new Date(d.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });
    const counts = this.ordersChartData.map(d => Number(d.count));
    // Kuruştan TL'ye çevir (100 kuruş = 1 TL)
    const revenues = this.ordersChartData.map(d => Number(d.revenue) / 100);

    this.ordersChartOptions = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(25, 32, 56, 0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#fff' }
      },
      legend: {
        data: ['Sipariş Sayısı'],
        textStyle: { color: '#8f9bb3' },
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '12%',
        top: '8%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: 'rgba(143, 155, 179, 0.2)' } },
        axisLabel: { color: '#8f9bb3', fontSize: 11 },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisLabel: { color: '#8f9bb3', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(143, 155, 179, 0.1)' } }
      },
      series: [{
        name: 'Sipariş Sayısı',
        type: 'bar',
        data: counts,
        barWidth: '60%',
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#3366ff' },
              { offset: 1, color: '#598bff' }
            ]
          },
          borderRadius: [6, 6, 0, 0]
        }
      }]
    };

    this.revenueChartOptions = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(25, 32, 56, 0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#fff' },
        formatter: (params: any) => {
          return `${params[0].axisValue}<br/>Gelir: ₺${Number(params[0].value).toFixed(2)}`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '8%',
        top: '8%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: 'rgba(143, 155, 179, 0.2)' } },
        axisLabel: { color: '#8f9bb3', fontSize: 11 },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisLabel: { color: '#8f9bb3', fontSize: 11, formatter: '₺{value}' },
        splitLine: { lineStyle: { color: 'rgba(143, 155, 179, 0.1)' } }
      },
      series: [{
        name: 'Gelir',
        type: 'line',
        data: revenues,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        showSymbol: false,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0, 214, 143, 0.4)' },
              { offset: 1, color: 'rgba(0, 214, 143, 0.02)' }
            ]
          }
        },
        itemStyle: { color: '#00d68f' },
        lineStyle: { color: '#00d68f', width: 3 }
      }]
    };
  }

  updateStatusPieChart() {
    const data = this.ordersByStatus.map(item => ({
      name: this.statusLabels[item.status] || item.status,
      value: Number(item.count),
      itemStyle: { color: this.statusColors[item.status] || '#8f9bb3' }
    }));

    this.statusPieOptions = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
        backgroundColor: 'rgba(25, 32, 56, 0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#fff' }
      },
      legend: {
        orient: 'horizontal',
        bottom: 10,
        left: 'center',
        textStyle: { color: '#8f9bb3', fontSize: 11 },
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 15
      },
      series: [{
        name: 'Sipariş Durumu',
        type: 'pie',
        radius: ['40%', '60%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6
        },
        label: { show: false },
        emphasis: {
          label: {
            show: true,
            fontSize: '14',
            fontWeight: 'bold',
            color: '#fff'
          },
          itemStyle: {
            shadowBlur: 20,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        labelLine: { show: false },
        data: data
      }]
    };
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'pending': 'warning',
      'processing': 'info',
      'shipped': 'primary',
      'delivered': 'success',
      'completed': 'success',
      'success': 'success',
      'cancelled': 'danger',
      'refunded': 'danger',
      'failed': 'danger'
    };
    return classes[status] || 'basic';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(amount: string | number): string {
    // Kuruştan TL'ye çevir (100 kuruş = 1 TL)
    const tlAmount = Number(amount) / 100;
    return '₺' + tlAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatNumber(num: string | number): string {
    return Number(num).toLocaleString('tr-TR');
  }
}
