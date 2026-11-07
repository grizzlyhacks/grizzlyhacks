import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {AuthService} from '../services/auth.service';
import {MenuLink, MenuLinksService} from '../services/menu-links.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  isCollapsed = true;
  links: MenuLink[] = [];

  constructor(public router: Router, public auth: AuthService, private menuLinksService: MenuLinksService) { }

  ngOnInit(): void {
    this.menuLinksService.getMenuLinks().subscribe((links: MenuLink[]) => {
      this.links = links.filter(link => link.isVisible);
    });
  }

  openLink(link: MenuLink): void {
    if (link.isExternal && link.url) {
      window.open(link.url, '_blank');
      return;
    }

    if (link.route) {
      this.router.navigate([link.route]);
    }
  }

  openExternalLink(url: string): void {
    window.open(url, '_blank');
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
  }
}
