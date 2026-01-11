import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'kurusToTl'
})
export class KurusToTlPipe implements PipeTransform {
  transform(value: number | string | null | undefined, decimals: number = 2): string {
    if (value === null || value === undefined || value === '') {
      return '0';
    }
    
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numValue)) {
      return '0';
    }
    
    // Kuruşu TL'ye çevir (100 kuruş = 1 TL)
    const tlValue = numValue / 100;
    
    // Formatla
    return tlValue.toLocaleString('tr-TR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }
}
