import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration from Firebase Console
const firebaseConfig = {
    apiKey: 'AIzaSyBfz6IwL_cCaUCUV3dtqp69ExUonvf273o',
    authDomain: 'ielts-f4478.firebaseapp.com',
    projectId: 'ielts-f4478',
    storageBucket: 'ielts-f4478.firebasestorage.app',
    messagingSenderId: '1042032147715',
    appId: '1:1042032147715:web:fe139149cae68ad6543d36',
    measurementId: 'G-K2MHZNCDKR',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services for use across the app
export const auth = getAuth(app);

export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
