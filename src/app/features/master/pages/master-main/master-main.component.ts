import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';


@Component({
  selector: 'app-master-main',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './master-main.component.html',
  styleUrl: './master-main.component.css'
})
export class MasterMainComponent {
  constructor(private router: Router) {}

 
}
