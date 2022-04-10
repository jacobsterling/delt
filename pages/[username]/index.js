import UserProfile from '../../components/UserProfile';
import DesignFeed from '../../components/DesignFeed'
import { getUserWithUsername, designToJSON, db } from '../../lib/firebase';
import { query, collection } from "firebase/firestore";

export async function getServerSideProps({ query }) {

  const { username } = query;
  const userDoc = await getUserWithUsername(username);

  console.log(userDoc);

  if (!userDoc) {
    return {
      notFound: true,
    };
  }

  let user = null;
  let designs = null;

 

  if (userDoc) {
    // user = userDoc;
    user = userDoc.docs[0].data();
    // console.log(userDoc)
    // doc(collection(db, 'usernames'),userDoc)

    // const docRef =  collection(db,userDoc,'designs')
    // console.log(docRef)

    // const designsQuery = query(docRef,where('published', '==', true))
    // .orderBy('createdAt', 'desc')
    // .limit(5)

    // designs = (await designsQuery.get()).docs.map(designToJSON);
  }
  
  return {
    props: { user, designs },
  }
}

export default function UserProfilePage({ user, designs }) {
  return (
    <main>
      <UserProfile user={user} />
      <DesignFeed designs={designs} />
    </main>
  )
}