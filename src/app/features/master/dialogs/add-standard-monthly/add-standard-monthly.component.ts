import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-standard-monthly',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './add-standard-monthly.component.html',
  styleUrl: './add-standard-monthly.component.css'
})
export class AddStandardMonthlyComponent {
  gradeType: string = 'health';
  insuranceType: string = '1';
  validFrom: string = '';
  grade: number | null = null;
  compensation: number | null = null;
  lowerLimit: number | null = null;
  upperLimit: number | null = null;

  @Output() added = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();

  onSubmit() {
    if (!this.validFrom || !this.grade || !this.compensation || this.lowerLimit == null || this.upperLimit == null) return;
    const id = `${this.grade}_${this.validFrom}`;
    this.added.emit({
      gradeType: this.gradeType,
      insuranceType: this.insuranceType,
      validFrom: this.validFrom,
      grade: this.grade,
      compensation: this.compensation,
      lowerLimit: this.lowerLimit,
      upperLimit: this.upperLimit,
      id,
      validTo: '',
      updatedAt: new Date()
    });
  }

  onCancel() {
    this.cancelled.emit();
  }
}
