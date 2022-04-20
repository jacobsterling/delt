import styles from '../../styles/Admin.module.css';
import AuthCheck from '../../components/AuthCheck';
import DesignFeed from '../../components/DesignFeed';

import { db, auth } from '../../lib/firebase';
import { UserContext } from '../../lib/context.js';

import { useContext, useState } from 'react';
import { useRouter } from 'next/router';
import { useCollection } from 'react-firebase-hooks/firestore';
import kebabCase from 'lodash.kebabcase';
import toast from 'react-hot-toast';
import { doc, collection, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";

export default function AdminPage({ props }) {
  return (
    <main>
      <AuthCheck>
        <DesignList/>
        <CreateNewDesign />
      </AuthCheck>
    </main>
  )
}

function DesignList() {
  const uid = auth.currentUser.uid
  const ref = collection(db, `users/${uid}/designs`);
  const q = query(ref,orderBy("createdAt"))
  const [querySnapshot] = useCollection(q);
  const designs = querySnapshot?.docs.map((doc) => doc.data());

  return (
    <>
      <h1>Manage your Designs</h1>
      <DesignFeed designs={designs} admin />
    </>
  )
}

function CreateNewDesign() {
  const router = useRouter();
  const { username } = useContext(UserContext);
  const [title, setTitle] = useState('');
  const slug = encodeURI(kebabCase(title));

  const isValid = title.length > 3 && title.length < 100;

  const createDesign =  async (e) => {
    e.preventDefault();
    const uid = auth.currentUser.uid;
    const ref = doc(collection( db,`users/${uid}/designs`),slug);

    const data = {
      title,
      slug,
      uid,
      username,
      published: false,
      content: '# hello world!',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      heartCount: 0,
    };

    await setDoc(ref,data);

    toast.success(`${title} created !`)

    router.push(`/admin/${slug}`)

  }

  return(
    <form onSubmit={createDesign}>
      <input
        value = {title}
        onChange = {(e) => setTitle(e.target.value)}
        placeholder="Design Name"
        className={styles.input}
      />
      <p>
        <strong>Slug:</strong> {slug}
      </p>
      <button type="submit" disabled={!isValid} className="btn-green">
        Create Design
      </button>
    </form>
  );
}