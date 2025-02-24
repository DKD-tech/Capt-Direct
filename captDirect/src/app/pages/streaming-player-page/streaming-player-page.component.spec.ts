import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StreamingPlayerPageComponent } from './streaming-player-page.component';

describe('StreamingPlayerPageComponent', () => {
  let component: StreamingPlayerPageComponent;
  let fixture: ComponentFixture<StreamingPlayerPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StreamingPlayerPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StreamingPlayerPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
