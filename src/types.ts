import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'teacher';

export interface User {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  photoURL?: string;
}

export interface Schedule {
  id: string;
  weekNumber: number;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  content: string; // Markdown
  authorId: string;
  createdAt: Timestamp;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'urgent';
  authorId: string;
  createdAt: Timestamp;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
