import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-manage-companies',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './manage-companies.component.html',
  styleUrl: './manage-companies.component.css'
})
export class ManageCompaniesComponent {
  constructor(private router: Router) {}
}
