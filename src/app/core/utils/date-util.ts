import { Timestamp } from '@angular/fire/firestore';

export function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate(); // Firestore Timestamp
  if (typeof value === 'string' && !isNaN(Date.parse(value))) return new Date(value);
  return null;
}
