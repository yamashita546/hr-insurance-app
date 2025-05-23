import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HealthInsuranceGrade, PensionInsuranceGrade, GradeType } from '../../../../core/models/standard-manthly.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-edit-standard-monthly',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './edit-standard-monthly.component.html',
  styleUrl: './edit-standard-monthly.component.css'
})
export class EditStandardMonthlyComponent implements OnInit {
  @Input() data!: HealthInsuranceGrade | PensionInsuranceGrade;
  @Output() saved = new EventEmitter<HealthInsuranceGrade | PensionInsuranceGrade>();
  @Output() cancelled = new EventEmitter<void>();

  formData: any = {};
  originalData: any = {};
  GradeType = GradeType;

  ngOnInit() {
    this.formData = { ...this.data };
    this.originalData = { ...this.data };
  }

  isChanged(field: string): boolean {
    return this.formData[field] !== this.originalData[field];
  }

  onSave() {
    const emitData = {
      ...this.formData,
      id: String(this.originalData.id).trim(),
      gradeType: String(this.originalData.gradeType).trim(),
      insuranceType: String(this.originalData.insuranceType).trim(),
      validFrom: String(this.originalData.validFrom).trim(),
      updatedAt: new Date()
    };
    this.saved.emit(emitData);
  }

  onCancel() {
    this.cancelled.emit();
  }
}
