import { Pipe, PipeTransform } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';

@Pipe({
  name: 'dateTimestamp',
  standalone: true
})
export class DateTimestampPipe implements PipeTransform {
  transform(value: any, format: string = 'yyyy/MM/dd'): string {
    let date: Date | null = null;
    if (!value) return '';
    if (value instanceof Date) {
      date = value;
    } else if (value instanceof Timestamp) {
      date = value.toDate();
    } else if (typeof value === 'string' && !isNaN(Date.parse(value))) {
      date = new Date(value);
    }
    if (!date) return '';
    return new Intl.DateTimeFormat('ja-JP', this.getOptions(format)).format(date);
  }

  private getOptions(format: string): Intl.DateTimeFormatOptions {
    if (format === 'yyyy/MM/dd') {
      return { year: 'numeric', month: '2-digit', day: '2-digit' };
    }
    if (format === 'yyyy') {
      return { year: 'numeric' };
    }
    return {};
  }
}
