import Loader from '../components/Loader'
import DesignFeed from '../components/DesignFeed';
import { db, designToJSON, fromMillis } from '../lib/firebase';
import { query, where, getDocs, orderBy, limit, startAfter, collectionGroup } from "firebase/firestore";
import { useState } from 'react';

// Max post to query per page
const LIMIT = 1;

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
    const cursor = typeof last.createdAt == 'number' ? fromMillis(last.createdAt) : last.createdAt;
    const colRef = collectionGroup(db,'designs')
    const designsQuery = query(colRef,where('published', '==', true), orderBy("createdAt","desc"),startAfter(cursor), limit(LIMIT))

    const querySnapshot = await getDocs(designsQuery);
    const newDesigns = querySnapshot.docs.map((doc) => doc.data());

    setDesigns(designs.concat(newDesigns))
    setLoading(false);

    if (newDesigns.length < LIMIT) {
      setDesignsEnd(true);
    }
  } 

  return (
  <main>
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
