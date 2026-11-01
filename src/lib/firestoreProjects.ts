import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { TranscriptRecord, UserProfile, SubscriptionPlan, TranscriptionJob } from '../types';

const PROJECTS_COLLECTION = 'projects';
const USERS_COLLECTION = 'users';
const JOBS_COLLECTION = 'jobs';

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const ref = doc(db, USERS_COLLECTION, userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${USERS_COLLECTION}/${userId}`);
    return null;
  }
}

export async function createOrUpdateUserProfile(profile: Partial<UserProfile> & { uid: string; email: string }): Promise<UserProfile> {
  const userId = profile.uid;
  try {
    const existing = await getUserProfile(userId);
    const updated: UserProfile = {
      uid: userId,
      email: profile.email,
      displayName: profile.displayName || existing?.displayName || profile.email.split('@')[0],
      photoURL: profile.photoURL || existing?.photoURL || '',
      plan: existing?.plan || 'free',
      transcriptionMinutesUsed: existing?.transcriptionMinutesUsed || 0,
      transcriptionMinutesLimit: existing?.transcriptionMinutesLimit || 60,
      defaultLanguage: profile.defaultLanguage || existing?.defaultLanguage || 'auto',
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, USERS_COLLECTION, userId), updated, { merge: true });
    return updated;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${USERS_COLLECTION}/${userId}`);
    throw err;
  }
}

export async function incrementUserUsage(userId: string, minutesToAdd: number): Promise<void> {
  try {
    const profile = await getUserProfile(userId);
    if (!profile) return;
    const newUsed = Math.min(
      profile.transcriptionMinutesLimit,
      Number((profile.transcriptionMinutesUsed + minutesToAdd).toFixed(1))
    );
    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      transcriptionMinutesUsed: newUsed,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Could not update user usage quota:', err);
  }
}

export async function saveProjectToFirestore(project: TranscriptRecord): Promise<void> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) return;

  const projectPayload = {
    ...project,
    ownerId: currentUid,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, PROJECTS_COLLECTION, project.id), projectPayload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${PROJECTS_COLLECTION}/${project.id}`);
  }
}

export async function fetchUserProjectsFromFirestore(): Promise<TranscriptRecord[]> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) return [];

  try {
    const q = query(
      collection(db, PROJECTS_COLLECTION),
      where('ownerId', '==', currentUid)
    );
    const snap = await getDocs(q);
    const list: TranscriptRecord[] = [];
    snap.forEach((d) => {
      list.push(d.data() as TranscriptRecord);
    });
    // Sort by createdAt descending
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, PROJECTS_COLLECTION);
    return [];
  }
}

export async function deleteProjectFromFirestore(projectId: string): Promise<void> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) return;

  try {
    await deleteDoc(doc(db, PROJECTS_COLLECTION, projectId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${PROJECTS_COLLECTION}/${projectId}`);
  }
}
