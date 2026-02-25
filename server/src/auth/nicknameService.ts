import admin from '../firebaseAdmin';

const NICKNAMES_COLLECTION = 'nicknames';

export function normalizeNickname(nickname: string): string {
  return nickname.trim().toLowerCase().substring(0, 20);
}

export async function isNicknameTaken(nickname: string): Promise<boolean> {
  try {
    const db = admin.firestore();
    const normalized = normalizeNickname(nickname);
    if (!normalized) return true;
    const doc = await db.collection(NICKNAMES_COLLECTION).doc(normalized).get();
    return doc.exists;
  } catch {
    return false;
  }
}

/** 将昵称与 uid 绑定；若已被他人占用则返回 false */
export async function claimNickname(nickname: string, uid: string): Promise<boolean> {
  try {
    const db = admin.firestore();
    const normalized = normalizeNickname(nickname);
    if (!normalized) return false;
    const ref = db.collection(NICKNAMES_COLLECTION).doc(normalized);
    const doc = await ref.get();
    if (doc.exists && doc.data()?.uid !== uid) return false;
    await ref.set({ uid, updatedAt: Date.now() }, { merge: true });
    return true;
  } catch {
    return false;
  }
}
