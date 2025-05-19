import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CsvTemplateDownloadComponent } from './csv-template-download.component';

describe('CsvTemplateDownloadComponent', () => {
  let component: CsvTemplateDownloadComponent;
  let fixture: ComponentFixture<CsvTemplateDownloadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CsvTemplateDownloadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CsvTemplateDownloadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
