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
    //! cant orderby createdAt and limit to 5 posts per page, prob not needed
    //! nor can i get more than 1 design on design feed
    
    const colRef = collection(userDoc.docs[0].ref,'designs')
    const designsQuery = q(colRef,where('published', '==', true))
    // .orderBy('createdAt', 'desc')
    // .limit(5)

    const querySnapshot = await getDocs(designsQuery)
    designs = querySnapshot.docs.map(designToJSON);
  }
  
  return {
    props: { user, designs },
  }
}

export default function UserProfilePage({ user, designs }) {
  return (
    <main>
      <UserProfile user={user} />
      <div className="flex-container">
        <DesignFeed designs={designs} />
      </div>
    </main>
  )
}