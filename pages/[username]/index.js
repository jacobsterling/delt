import UserProfile from '../../components/UserProfile';
import DesignFeed from '../../components/DesignFeed'
import { getUserWithUsername, designToJSON, db } from '../../lib/firebase';
import { query as q, getDocs, collection, where } from "firebase/firestore";



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
    console.log(user)

    const colRef = collection(userDoc.docs[0].ref,'designs')

    const designsQuery = q(colRef,where('published', '==', true))
    // .orderBy('createdAt', 'desc')
    // .limit(5)

    console.log(designsQuery)

    const querySnapshot = await getDocs(designsQuery)
    designs = querySnapshot.docs.map(designToJSON);

    console.log(designs)
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