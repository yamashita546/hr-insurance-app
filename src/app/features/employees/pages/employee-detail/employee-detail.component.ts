import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [],
  templateUrl: './employee-detail.component.html',
  styleUrl: './employee-detail.component.css'
})
export class EmployeeDetailComponent implements OnInit {
  employeeId: string = '';
  lastName: string = '';
  firstName: string = '';

  constructor(private route: ActivatedRoute, private firestore: Firestore) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const docRef = doc(this.firestore, 'employees', id);
      const snap = await getDoc(docRef);
      const data = snap.data();
      if (data) {
        this.employeeId = data['employeeId'];
        this.lastName = data['lastName'];
        this.firstName = data['firstName'];
      }
    }
  }
}
