import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TituloDecoradoComponent } from './titulo-decorado.component';

describe('TituloDecoradoComponent', () => {
  let component: TituloDecoradoComponent;
  let fixture: ComponentFixture<TituloDecoradoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TituloDecoradoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TituloDecoradoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
