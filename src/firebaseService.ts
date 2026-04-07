import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { OperationType, FirestoreErrorInfo } from './types';

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const userService = {
  async getUser(uid: string) {
    const path = `users/${uid}`;
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },
  async createUser(uid: string, data: any) {
    const path = `users/${uid}`;
    try {
      await setDoc(doc(db, 'users', uid), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
};

export const scheduleService = {
  subscribeToSchedules(callback: (schedules: any[]) => void) {
    const path = 'schedules';
    const q = query(collection(db, 'schedules'), orderBy('createdAt', 'desc'), limit(10));
    return onSnapshot(q, (snapshot) => {
      const schedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(schedules);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },
  async addSchedule(data: any) {
    const path = 'schedules';
    try {
      await addDoc(collection(db, 'schedules'), {
        ...data,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
};

export const notificationService = {
  subscribeToNotifications(callback: (notifications: any[]) => void) {
    const path = 'notifications';
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(20));
    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(notifications);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },
  async addNotification(data: any) {
    const path = 'notifications';
    try {
      await addDoc(collection(db, 'notifications'), {
        ...data,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
};
