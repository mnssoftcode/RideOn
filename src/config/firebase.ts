import { FirebaseApp, initializeApp } from '@react-native-firebase/app';

let app: FirebaseApp | null = null;

export function initFirebaseIfNeeded() {
  if (!app) {
    app = initializeApp();
  }
  return app;
}


