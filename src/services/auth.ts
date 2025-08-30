import { useEffect, useMemo, useState } from 'react';
import { getAuth, onAuthStateChanged, ConfirmationResult } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export function useAuthState() {
  const [user, setUser] = useState<null | { uid: string }>(null);
  const [profileExists, setProfileExists] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), async (firebaseUser) => {
      setUser(firebaseUser ? { uid: firebaseUser.uid } : null);
      if (firebaseUser) {
        const doc = await firestore().collection('users').doc(firebaseUser.uid).get();
        setProfileExists(doc.exists);
      } else {
        setProfileExists(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return useMemo(
    () => ({
      isAuthenticated: !!user,
      needsProfile: !!user && !profileExists,
      loading,
      user,
    }),
    [user, profileExists, loading],
  );
}

export async function signInWithPhone(phoneNumber: string): Promise<ConfirmationResult> {
  const { signInWithPhoneNumber } = await import('@react-native-firebase/auth');
  return signInWithPhoneNumber(getAuth(), phoneNumber);
}


