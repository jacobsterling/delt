import Head from 'next/head'
import styles from '../styles/Home.module.css'
import Link from 'next/link'
import Loader from '../components/Loader'
import toast from 'react-hot-toast'
import DesignFeed from '../components/DesignFeed';
import { db, designToJSON, fromMillis } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, startAfter, collectionGroup } from "firebase/firestore";
import { useState } from 'react';

// Max post to query per page
const LIMIT = 2;

export async function getServerSideProps(context) {
  var colRef = collectionGroup(db,'designs')
  const designsQuery = query(colRef,where('published', '==', true), orderBy("createdAt","desc"), limit(LIMIT))
  const querySnapshot = await getDocs(designsQuery);
  let designs = querySnapshot.docs.map(designToJSON);
  return {
    props: {designs},
  };
}

export default function Home(props) {
  const [designs, setDesigns] = useState(props.designs)
  const [loading, setLoading] = useState(false)
  const [designsEnd, setDesignsEnd] = useState(false)
  
  const getMoreDesigns = async () => {
    setLoading(true);
    const last = designs[designs.length - 1]
    console.log("last",last.createdAt)
    const cursor = typeof last.createdAt == 'number' ? fromMillis(last.createdAt) : last.createdAt;
    console.log("cursor",cursor)
    const colRef = collection(db,'designs')
    const designsQuery = query(colRef,where('published', '==', true), orderBy("createdAt","desc"),startAfter(cursor), limit(LIMIT))

    const querySnapshot = await getDocs(designsQuery)
    const newDesigns = querySnapshot.docs.map((doc) => doc.data());

    setDesigns(designs.concat(newDesigns))
    setLoading(false);

    if (newDesigns.length < LIMIT) {
      setDesignsEnd(true);
    }
  } 

  return (
  <main>
  <div>
    <button onClick={() => toast.success('hello toast!')}>
      Toast Me
    </button>
  </div>
  <div className="flex-container">
    <DesignFeed designs={designs} />
    {!loading && !designsEnd && <button onClick={getMoreDesigns}>Show more</button> }
  </div>
  <div className="flex-container">
    <Loader show={loading} />
    {designsEnd && 'End of showcase'}
  </div>
  </main>
  );
} 
