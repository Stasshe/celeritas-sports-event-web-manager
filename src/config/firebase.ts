import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Database, getDatabase } from 'firebase/database';

const firebaseEnvironment = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_DATABASE_URL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
};

const requiredEnvironmentVariables = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_DATABASE_URL',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

export class FirebaseConfigurationError extends Error {
  constructor(readonly missingVariables: string[]) {
    super(`Missing Firebase environment variables: ${missingVariables.join(', ')}`);
    this.name = 'FirebaseConfigurationError';
  }
}

interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  database: Database;
}

function initializeFirebase(): FirebaseServices {
  const missingVariables = requiredEnvironmentVariables.filter(
    (name) => !firebaseEnvironment[name],
  );

  if (missingVariables.length > 0) {
    throw new FirebaseConfigurationError(missingVariables);
  }

  const app = initializeApp({
    apiKey: firebaseEnvironment.VITE_FIREBASE_API_KEY,
    authDomain: firebaseEnvironment.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: firebaseEnvironment.VITE_FIREBASE_DATABASE_URL,
    projectId: firebaseEnvironment.VITE_FIREBASE_PROJECT_ID,
    storageBucket: firebaseEnvironment.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: firebaseEnvironment.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: firebaseEnvironment.VITE_FIREBASE_APP_ID,
  });

  return {
    app,
    auth: getAuth(app),
    database: getDatabase(app),
  };
}

let firebaseServices: FirebaseServices | null = null;
export let firebaseInitializationError: Error | null = null;

try {
  firebaseServices = initializeFirebase();
} catch (error) {
  if (error instanceof Error) {
    firebaseInitializationError = error;
  } else {
    firebaseInitializationError = new Error('Firebase initialization failed');
  }
  console.error('Firebase initialization failed', error);
}

export function getFirebaseAuth(): Auth {
  if (!firebaseServices) {
    throw firebaseInitializationError ?? new Error('Firebase is not initialized');
  }

  return firebaseServices.auth;
}

export function getFirebaseDatabase(): Database {
  if (!firebaseServices) {
    throw firebaseInitializationError ?? new Error('Firebase is not initialized');
  }

  return firebaseServices.database;
}
