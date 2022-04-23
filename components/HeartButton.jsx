import { db, auth } from '../lib/firebase';
import { useDocumentData, useDocument } from 'react-firebase-hooks/firestore';
import { collection, writeBatch, increment, doc } from "firebase/firestore";
// Allows user to heart or like a post
export default function Heart({ designRef }) {
    //Listen to heart document for currently logged in user
    const heartRef = doc(collection(designRef, 'hearts'),auth.currentUser.uid);
    const [heartDoc] = useDocumentData(heartRef);
    
    //Create a user-to-design relationship
    const addHeart = async () => {
        const uid = auth.currentUser.uid;
        const batch = writeBatch(db)

        batch.update(designRef, { heartCount: increment(1)} );
        batch.set(heartRef, { uid });

        await batch.commit();
    };

    const removeHeart = async () => {
        const uid = auth.currentUser .uid;
        const batch = writeBatch(db)

        batch.update(designRef, { heartCount: increment(-1)} );
        batch.delete(heartRef, { uid });

        await batch.commit();
    };

    return heartDoc?.uid ? (
        <button onClick={removeHeart}>💔 Unheart</button>
    ) : (
        <button onClick={addHeart}>💗 Heart</button>
    );
}