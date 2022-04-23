import { db, designToJSON, getUserWithUsername } from "../../lib/firebase";
import { query, doc, getDocs, collection, where, collectionGroup, limit} from "firebase/firestore";
import styles from '../../styles/design.module.css';
import DesignContent from "../../components/DesignContent";
import { useDocumentData } from 'react-firebase-hooks/firestore';
import HeartButton from '../../components/HeartButton';
import AuthCheck from '../../components/AuthCheck';
import Metatags from '../../components/Metatags';
import Link from 'next/link';
import { UserContext } from '../../lib/context';
import { useContext } from 'react';

export async function getStaticProps({ params }) {
    const { username, slug }  = params;

    const userDoc = await getUserWithUsername(username);
    
    let design;
    let path;

    if (userDoc) {
        const designsRef = collection(userDoc.docs[0].ref,'designs')
        const designsQuery = query(designsRef,where('slug', '==', slug),limit(5))
        const designSnapshot = await getDocs(designsQuery);
        design = designSnapshot.docs.map(designToJSON)[0];
        const ref = designSnapshot.docs[0]._document.key.path.segments.at(-1)
        path = `${designsRef.path}/${ref}`
    }

    return {
       props: { design, path },
       revalidate: 5000
    };
}

export async function getStaticPaths() {
    const snapshot = await getDocs(collectionGroup(db, 'designs'))
    const paths = snapshot.docs.map((doc) => {
        const { slug, username } = doc.data();
        return {
            params: { username, slug },
        };
    });
    return {
        paths,
        fallback: 'blocking',
    };
}

export default function Design(props){
    const designRef = doc(db, props.path);

    const [realtimeDesign] = useDocumentData(designRef);

    const design = realtimeDesign || props.design

    const { user: currentUser } = useContext(UserContext);

    return (
        <main className={styles.container}>
             <Metatags title={design.title} description={design.title} />

            <section>
                <DesignContent design = {design}/>
            </section>

            <aside className = "card">
                <p>
                    <strong>{design.heartCount || 0} 🤍</strong>
                </p>

            <AuthCheck fallback={
                <Link href="/enter" passHref>
                    <button> 💗 Sign Up </button>
                </Link>
            }
            >
                <HeartButton designRef={designRef} />
            </AuthCheck>

        {currentUser?.uid === design.uid && (
          <Link href={`/admin/${design.slug}`} passHref>
            <button className="btn-blue">Edit Design</button>
          </Link>
        )}

            </aside>
        </main>
    )
}
