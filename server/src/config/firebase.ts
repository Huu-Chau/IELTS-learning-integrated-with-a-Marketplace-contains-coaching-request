import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

console.log('[Firebase] Initializing Firebase Admin SDK...');

// Initialize Firebase Admin SDK with environment variables
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Replace escaped newlines in the private key
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

console.log('[Firebase] Firebase Admin SDK initialized successfully', { projectId: process.env.FIREBASE_PROJECT_ID });

// Export Firestore, Auth, and Storage instances
export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();

export default admin;
