import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ATTENDANCE_COLUMN_ORDER, ATTENDANCE_COLUMN_LABELS } from '../../../../core/models/attendance.model';

@Component({
  selector: 'app-attendance-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance-detail.component.html',
  styleUrl: './attendance-detail.component.css'
})
export class AttendanceDetailComponent {
  @Input() attendance: any;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();

  columnOrder = ATTENDANCE_COLUMN_ORDER;
  columnLabels = ATTENDANCE_COLUMN_LABELS;

  onClose() {
    this.close.emit();
  }

  onSave() {
    this.save.emit(this.attendance);
  }
}
