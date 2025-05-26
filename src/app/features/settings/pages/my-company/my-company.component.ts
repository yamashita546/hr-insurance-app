import { Component } from '@angular/core';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { PREFECTURES, Prefecture } from '../../../../core/models/prefecture.model';
import { Observable } from 'rxjs';
import { AppUser } from '../../../../core/models/user.model';
import { Company } from '../../../../core/models/company.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-my-company',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-company.component.html',
  styleUrl: './my-company.component.css'
})
export class MyCompanyComponent {
  user$: Observable<AppUser | null>;
  company$: Observable<Company | null>;

  constructor(private userCompanyService: UserCompanyService) {
    this.user$ = this.userCompanyService.user$;
    this.company$ = this.userCompanyService.company$;
  }

  getPrefectureName(pref?: string | Prefecture): string {
    if (!pref) return '';
    if (typeof pref === 'object' && 'name' in pref) {
      return pref.name;
    }
    const found = PREFECTURES.find(p => p.code === pref);
    return found ? found.name : (typeof pref === 'string' ? pref : '');
  }
}
