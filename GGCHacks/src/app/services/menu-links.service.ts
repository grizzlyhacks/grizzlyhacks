import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

export interface MenuLink {
  documentID: string;
  label: string;
  route?: string;
  url?: string;
  isExternal: boolean;
  isVisible: boolean;
  order: number;
}

@Injectable({
  providedIn: 'root'
})
export class MenuLinksService {
  private menuLinksSubject = new BehaviorSubject<MenuLink[]>([]);
  menuLinks$: Observable<MenuLink[]> = this.menuLinksSubject.asObservable();

  constructor() {
    firebase.firestore()
      .collection('menuLinks')
      .orderBy('order', 'asc')
      .onSnapshot(snapshot => {
        const links = snapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              documentID: doc.id,
              label: data.label || 'Untitled Link',
              route: data.route || '',
              url: data.url || '',
              isExternal: !!data.isExternal,
              isVisible: data.isVisible !== false,
              order: typeof data.order === 'number' ? data.order : 0
            } as MenuLink;
          })
          .filter(link => link.isVisible);

        this.menuLinksSubject.next(links);
      }, error => {
        console.error('Error loading menu links:', error);
        this.menuLinksSubject.next([]);
      });
  }

  getMenuLinks(): Observable<MenuLink[]> {
    return this.menuLinks$;
  }

  addMenuLink(link: Partial<MenuLink>): Promise<firebase.firestore.DocumentReference> {
    const menuLink = this.normalizeLink(link);
    return firebase.firestore().collection('menuLinks').add(menuLink);
  }

  updateMenuLink(documentID: string, link: Partial<MenuLink>): Promise<void> {
    const menuLink = this.normalizeLink(link);
    return firebase.firestore().collection('menuLinks').doc(documentID).update(menuLink);
  }

  deleteMenuLink(documentID: string): Promise<void> {
    return firebase.firestore().collection('menuLinks').doc(documentID).delete();
  }

  private normalizeLink(link: Partial<MenuLink>): Partial<MenuLink> {
    return {
      label: link.label || 'Untitled Link',
      route: link.route || '',
      url: link.url || '',
      isExternal: !!link.isExternal,
      isVisible: link.isVisible !== false,
      order: typeof link.order === 'number' ? link.order : 0
    };
  }
}
