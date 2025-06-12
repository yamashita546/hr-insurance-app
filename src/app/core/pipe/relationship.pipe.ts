import { Pipe, PipeTransform } from '@angular/core';
import { RELATIONSHIP_TYPES } from '../models/dependents.relationship.model';

@Pipe({
  name: 'relationshipName',
  standalone: true
})
export class RelationshipNamePipe implements PipeTransform {
  transform(value: string): string {
    const found = RELATIONSHIP_TYPES.find(r => r.code === value);
    return found ? found.name : value || '';
  }
}
