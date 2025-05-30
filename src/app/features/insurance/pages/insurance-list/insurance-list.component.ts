import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-insurance-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './insurance-list.component.html',
  styleUrl: './insurance-list.component.css'
})
export class InsuranceListComponent {

}
