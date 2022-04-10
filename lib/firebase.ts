import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

const firebaseConfig = {

    apiKey: "AIzaSyDd9bap599i0FTYbNux_e3af8PD5yrFiU4",
  
    authDomain: "delt-b4a22.firebaseapp.com",
  
    projectId: "delt-b4a22",
  
    storageBucket: "delt-b4a22.appspot.com",
  
    messagingSenderId: "152618058337",
  
    appId: "1:152618058337:web:e005c9ab97726b3aeb2020",
  
    measurementId: "G-KKE8EY1VHF"
  
  };

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();
export const auth = getAuth();

/**`
 * Gets a users/{uid} document with username
 * @param  {string} username
 */
 export async function getUserWithUsername(username) {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', username));
  const userDoc = await getDocs(q);
  userDoc.forEach((doc) => {
    // doc.data() is never undefined for query doc snapshots
    console.log(doc.id, " => ", doc.data());
  });

  return userDoc;
}

/**`
 * Converts a firestore document to JSON
 * @param  {DocumentSnapshot} doc
 */

export function designToJSON(doc) {
  const data = doc.data();
  return {
    ...data,
    // Gotcha! firestore timestamp NOT serializable to JSON. Must convert to milliseconds
    createdAt: data.createdAt.toMillis(),
    updatedAt: data.updatedAt.toMillis(),
  };
}
