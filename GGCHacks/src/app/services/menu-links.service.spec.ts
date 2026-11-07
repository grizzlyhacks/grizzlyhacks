import { TestBed } from '@angular/core/testing';

import { MenuLinksService } from './menu-links.service';

describe('MenuLinksService', () => {
  let service: MenuLinksService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MenuLinksService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
