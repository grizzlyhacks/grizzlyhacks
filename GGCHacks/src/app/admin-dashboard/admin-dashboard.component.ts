import { Component } from "@angular/core";
import { User } from "../interfaces/user";
import { Subscription } from "rxjs";
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from "@angular/fire/compat/firestore";
import { AngularFireStorage } from "@angular/fire/compat/storage";
import { AuthService } from "../services/auth.service";
import { MenuLink, MenuLinksService } from "../services/menu-links.service";

@Component({
  selector: "app-admin-dashboard",
  templateUrl: "./admin-dashboard.component.html",
  styleUrls: ["./admin-dashboard.component.css"],
})
export class AdminDashboardComponent {
  users: User[];
  fullUserArray: User[];
  sub: Subscription;
  search: string;
  adminFilter = "All Members";
  applicationFilter = "No Filter";
  acceptedFilter = "No Filter";
  isCreatingEvent: boolean;
  flyers: any[] = [];
  selectedFile: File | null = null;
  isDragOver = false;
  isUploading = false;
  uploadProgress = 0;
  menuLinks: MenuLink[] = [];
  editingMenuLinkId: string | null = null;
  menuLinkForm = {
    label: "",
    route: "",
    url: "",
    isExternal: false,
    isVisible: true,
    order: 0
  };

  constructor(
    private afs: AngularFirestore,
    public auth: AuthService,
    private storage: AngularFireStorage,
    private menuLinksService: MenuLinksService
  ) {
    this.isCreatingEvent = false;

  }

  async ngOnInit(): Promise<void> {
    await this.fetchAllUsers();
    await this.loadFlyers();
    this.loadMenuLinks();
  } /**

       * Fetches all users from Firestore using pagination.

       */

  async fetchAllUsers(): Promise<void> {
    const allUsers: User[] = [];

    const query = this.afs.collection<User>("users").ref; // Reference to the Firestore collection // Fetch users in batches

    let snapshot = await query.get();

    while (!snapshot.empty) {
      snapshot.forEach((doc) => {
        allUsers.push(doc.data() as User); // Add each user to the array
      }); // Get the last document in the snapshot for pagination

      const lastDoc = snapshot.docs[snapshot.docs.length - 1]; // Fetch the next batch of users

      snapshot = await query.startAfter(lastDoc).get();
    } // Update the component state

    this.fullUserArray = allUsers;

    this.users = allUsers;

    this.users.sort((a, b) => (a.firstName > b.firstName ? 1 : -1));
  }

  /**
   * Destroys the component and unsubscribes from the database.
   */
  ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }


  makeAdmin(user: User) {
    if (
      confirm(
        `Are you sure you want to make ${user.firstName} ${user.lastName} an admin?`
      )
    ) {
      const userRef: AngularFirestoreDocument<User> = this.afs.doc(
        `users/${user.uid}`
      );
      user.adminLevel = 1;
      userRef.update(user);
    }
  }

  takeAdmin(user: User) {
    if (
      confirm(
        `Are you sure you want to take ${user.firstName} ${user.lastName}'s admin status?`
      )
    ) {
      const userRef: AngularFirestoreDocument<User> = this.afs.doc(
        `users/${user.uid}`
      );
      user.adminLevel = 0;
      userRef.update(user);
    }
  }

  makeSuperAdmin(user: User) {
    if (
      confirm(
        `Are you sure you want to make ${user.firstName} ${user.lastName} a super admin?`
      )
    ) {
      const userRef: AngularFirestoreDocument<User> = this.afs.doc(
        `users/${user.uid}`
      );
      user.adminLevel = 2;
      userRef.update(user);
    }
  }

  takeSuperAdmin(user: User) {
    if (user.email === this.auth.user.email) {
      alert("You cannot take your own super admin status.");
      return;
    }
    if (
      confirm(
        `Are you sure you want to take ${user.firstName} ${user.lastName}'s super admin status?`
      )
    ) {
      const userRef: AngularFirestoreDocument<User> = this.afs.doc(
        `users/${user.uid}`
      );
      user.adminLevel = 1;
      userRef.update(user);
    }
  }

  acceptApplication(user: User) {
    const userRef: AngularFirestoreDocument<User> = this.afs.doc(
      `users/${user.uid}`
    );
    user.registeredFor.push(new Date().getFullYear());
    userRef.update(user);
  }

  revokeApplication(user: User) {
    const userRef: AngularFirestoreDocument<User> = this.afs.doc(
      `users/${user.uid}`
    );
    const i = user.registeredFor.indexOf(new Date().getFullYear());
    if (i !== -1) user.registeredFor.splice(i, 1);
    userRef.update(user);
  }

  isRegisteredForCurrentYear(user: User): boolean {
    return user.registeredFor.includes(new Date().getFullYear());
  }

  changeAdminFilter(filter: string) {
    switch (filter) {
      case "All Members": {
        this.adminFilter = "All Members";
        break;
      }
      case "Non Admins": {
        this.adminFilter = "Non Admins";
        break;
      }
      case "All Admins": {
        this.adminFilter = "All Admins";
        break;
      }
      case "Admins": {
        this.adminFilter = "Admins";
        break;
      }
      case "Super Admins": {
        this.adminFilter = "Super Admins";
        break;
      }
    }
    this.filterUserEntries();
  }

  changeApplicationFilter(filter: string) {
    switch (filter) {
      case "No Filter": {
        this.applicationFilter = "No Filter";
        break;
      }
      case "Submitted": {
        this.applicationFilter = "Submitted";
        break;
      }
      case "Not Submitted": {
        this.applicationFilter = "Not Submitted";
        break;
      }
    }
    this.filterUserEntries();
  }

  changeAcceptedFilter(filter: string) {
    switch (filter) {
      case "No Filter": {
        this.acceptedFilter = "No Filter";
        break;
      }
      case "Accepted": {
        this.acceptedFilter = "Accepted";
        break;
      }
      case "Not Accepted": {
        this.acceptedFilter = "Not Accepted";
        break;
      }
    }
    this.filterUserEntries();
  }

  filterUserEntries() {
    //Show the selected Admin Filter.
    switch (this.adminFilter) {
      case "All Members": {
        this.users = this.fullUserArray;
        break;
      }
      case "Non Admins": {
        this.users = this.fullUserArray.filter((u) => u.adminLevel == 0);
        break;
      }
      case "All Admins": {
        this.users = this.fullUserArray.filter((u) => u.adminLevel >= 1);
        break;
      }
      case "Admins": {
        this.users = this.fullUserArray.filter((u) => u.adminLevel == 1);
        break;
      }
      case "Super Admins": {
        this.users = this.fullUserArray.filter((u) => u.adminLevel == 2);
        break;
      }
    }

    //Show the selected Application Filter.
    switch (this.applicationFilter) {
      case "Submitted": {
        this.users = this.users.filter(
          (u) => u.application != null && u.application.submitted
        );
        break;
      }
      case "Not Submitted": {
        this.users = this.users.filter(
          (u) => u.application == null || !u.application.submitted
        );
        break;
      }
    }

    //Show the selected Accepted Filter.
    switch (this.acceptedFilter) {
      case "Accepted": {
        this.users = this.users.filter((u) =>
          this.isRegisteredForCurrentYear(u)
        );
        break;
      }
      case "Not Accepted": {
        this.users = this.users.filter(
          (u) => !this.isRegisteredForCurrentYear(u)
        );
        break;
      }
    }
  }

  loadMenuLinks(): void {
    this.menuLinksService.getMenuLinks().subscribe((links: MenuLink[]) => {
      this.menuLinks = links;
    });
  }

  submitMenuLink(): void {
    if (!this.menuLinkForm.label.trim()) {
      alert('Menu link label is required.');
      return;
    }

    const payload: Partial<MenuLink> = {
      label: this.menuLinkForm.label.trim(),
      route: this.menuLinkForm.route?.trim() || '',
      url: this.menuLinkForm.url?.trim() || '',
      isExternal: this.menuLinkForm.isExternal,
      isVisible: this.menuLinkForm.isVisible,
      order: this.menuLinkForm.order || this.menuLinks.length + 1
    };

    if (this.editingMenuLinkId) {
      this.menuLinksService.updateMenuLink(this.editingMenuLinkId, payload)
        .then(() => {
          alert('Menu link updated successfully.');
          this.resetMenuLinkForm();
        })
        .catch(() => alert('Failed to update menu link.'));
      return;
    }

    this.menuLinksService.addMenuLink(payload)
      .then(() => {
        alert('Menu link added successfully.');
        this.resetMenuLinkForm();
      })
      .catch(() => alert('Failed to create menu link.'));
  }

  editMenuLink(link: MenuLink): void {
    this.editingMenuLinkId = link.documentID;
    this.menuLinkForm = {
      label: link.label,
      route: link.route || '',
      url: link.url || '',
      isExternal: !!link.isExternal,
      isVisible: link.isVisible !== false,
      order: link.order || 0
    };
  }

  deleteMenuLink(documentID: string): void {
    if (!confirm('Delete this menu link?')) {
      return;
    }

    this.menuLinksService.deleteMenuLink(documentID)
      .then(() => {
        if (this.editingMenuLinkId === documentID) {
          this.resetMenuLinkForm();
        }
      })
      .catch(() => alert('Failed to delete menu link.'));
  }

  resetMenuLinkForm(): void {
    this.editingMenuLinkId = null;
    this.menuLinkForm = {
      label: '',
      route: '',
      url: '',
      isExternal: false,
      isVisible: true,
      order: this.menuLinks.length + 1
    };
  }

  //this object holds the new event data
  newEvent = {
    id: "",
    title: "",
    startTime: "",
    endTime: "",
    day: "",
  };

  //this function handles the event submission
  submitEvent() {
    if (
      !this.newEvent.title ||
      !this.newEvent.startTime ||
      !this.newEvent.endTime ||
      !this.newEvent.day
    ) {
      console.log("Please fill all the fields");
      return;
    }
    this.newEvent.id = new Date().getTime().toString();
    console.log("Event Created:", this.newEvent);

    this.isCreatingEvent = false;
    this.newEvent = { id: "", title: "", startTime: "", endTime: "", day: "" }; // Reset form
  }

  // Drag and drop handlers
  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  onFileDropped(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  // File selection handler
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.handleFile(file);
    }
  }

  private handleFile(file: File) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    this.selectedFile = file;
  }

  // Upload flyer to Firebase Storage
  async uploadFlyer() {
    if (!this.selectedFile) return;

    this.isUploading = true;
    this.uploadProgress = 0;

    try {
      // Create unique filename
      const timestamp = Date.now();
      const fileName = `flyers/${timestamp}_${this.selectedFile.name}`;

      // Upload to Firebase Storage
      const fileRef = this.storage.ref(fileName);
      const uploadTask = this.storage.upload(fileName, this.selectedFile);

      // Monitor upload progress
      uploadTask.percentageChanges().subscribe(progress => {
        this.uploadProgress = Math.round(progress || 0);
      });

      // Wait for upload to complete
      await uploadTask;

      // Get download URL
      const downloadURL = await fileRef.getDownloadURL().toPromise();

      // Save flyer info to Firestore
      const flyerData = {
        name: this.selectedFile.name,
        url: downloadURL,
        fileName: fileName,
        uploadedAt: new Date(),
        isActive: false
      };

      await this.afs.collection('flyers').add(flyerData);

      // Reset form
      this.selectedFile = null;
      this.uploadProgress = 0;
      this.isUploading = false;

      // Reload flyers
      this.loadFlyers();

      alert('Flyer uploaded successfully!');

    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
      this.isUploading = false;
      this.uploadProgress = 0;
    }
  }

  // Load flyers from Firestore
  loadFlyers() {
    try {
      this.afs
        .collection('flyers', ref => ref.orderBy('uploadedAt', 'desc'))
        .valueChanges({ idField: 'id' })
        .subscribe(flyers => {
          this.flyers = flyers;
        });
    } catch (error) {
      console.error('Error loading flyers:', error);
      this.flyers = [];
    }
  }

  // Delete flyer
  async deleteFlyer(flyerId: string, index: number) {
    if (!confirm('Are you sure you want to delete this flyer?')) return;

    try {
      const flyer = this.flyers[index];

      // Delete from Storage
      await this.storage.ref(flyer.fileName).delete()

      // Delete from Firestore
      await this.afs.collection('flyers').doc(flyerId).delete();

      // Remove from local array
      this.flyers.splice(index, 1);

      alert('Flyer deleted successfully!');

    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete flyer. Please try again.');
    }
  }

  // Set flyer as active/inactive
  async setAsActive(flyerId: string, index: number) {
    try {
      const flyer = this.flyers[index];
      const newActiveStatus = !flyer.isActive;

      // If setting as active, deactivate all others first
      if (newActiveStatus) {
        // Update all flyers to inactive using compat syntax
        const batch = this.afs.firestore.batch();

        this.flyers.forEach(f => {
          if (f.id !== flyerId) {
            const flyerRef = this.afs.collection('flyers').doc(f.id).ref;
            batch.update(flyerRef, { isActive: false });
          }
        });

        await batch.commit();

        // Update local array
        this.flyers.forEach(f => f.isActive = false);
      }

      // Update the selected flyer
      await this.afs.collection('flyers').doc(flyerId).update({
        isActive: newActiveStatus
      });

      // Update local array
      this.flyers[index].isActive = newActiveStatus;

    } catch (error) {
      console.error('Failed to update flyer status:', error);
      alert('Failed to update flyer status. Please try again.');
    }
  }


  // =============================
// 🔧 FIRESTORE CONTENT EDITOR
// =============================
  selectedCollection: string | null = null;
  firestoreDocs: any[] = [];

  loadFirestoreCollection(collection: string): void {
    if (!collection) return;

    this.selectedCollection = collection;
    console.log(`Loading Firestore collection: ${collection}`);

    this.afs
      .collection(collection)
      .snapshotChanges()
      .subscribe(actions => {
        this.firestoreDocs = actions.map(a => {
          const data = a.payload.doc.data() as Record<string, any> || {};
          const id = a.payload.doc.id;
          return { documentId: id, ...data };
        });
        console.log('Loaded docs with Firestore IDs:', this.firestoreDocs);
      });
  }


  getKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  getInputType(key: string, value: any): string {
    if (typeof value === 'boolean') return 'checkbox';
    if (key.toLowerCase().includes('link') || key.toLowerCase().includes('url')) return 'url';
    if (typeof value === 'string' && value.length > 100) return 'textarea';
    return 'text';
  }

  async updateFirestoreDoc(doc: any): Promise<void> {
    if (!this.selectedCollection) return;

    // If the document doesn’t have an ID, we’ll create one
    let id = doc.documentId;
    const isNew = !id;

    if (isNew) {
      id = this.afs.createId(); // Generate a new Firestore ID
      doc.documentId = id;
    }

    // Prepare clean data to store
    const updateData = { ...doc };
    delete updateData.documentId;

    console.log(`${isNew ? 'Creating' : 'Updating'} document: ${this.selectedCollection}/${id}`);
    console.log('Data:', updateData);

    try {
      await this.afs
        .collection(this.selectedCollection)
        .doc(id)
        .set(updateData, { merge: true });

      console.log(`Successfully ${isNew ? 'created' : 'updated'} ${this.selectedCollection}/${id}`);
      alert(`Document "${id}" ${isNew ? 'created' : 'updated'} successfully!`);
    } catch (err) {
      console.error('Firestore operation failed:', err);
      alert('Failed to update or create document.');
    }
  }



  async deleteFirestoreDoc(doc: any): Promise<void> {
    if (!this.selectedCollection) return;
    const id = doc.documentId || doc.id;
    if (!id) {
      alert('Cannot delete: document has no ID.');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${id}"?`)) return;

    try {
      await this.afs.collection(this.selectedCollection).doc(id).delete();
      alert('🗑️ Document deleted successfully.');
      this.firestoreDocs = this.firestoreDocs.filter(d => d.documentId !== id);
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Failed to delete document.');
    }
  }

  addNewFaq() {
    // Remove limit — or adjust to a custom cap if you wish
    if (this.firestoreDocs.length >= 6) {
      const confirmAdd = confirm(
        'You already have 6 FAQs. Add another anyway?'
      );
      if (!confirmAdd) return;
    }

    const newFaq = {
      question: '',
      answer: '',
      isActive: true,
      order: this.firestoreDocs.length + 1
    };

    this.firestoreDocs.push(newFaq);
  }






  protected readonly ondragover = ondragover;
}
