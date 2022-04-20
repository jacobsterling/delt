import { db, designToJSON, getUserWithUsername } from "../../lib/firebase";
import { query, doc, getDocs, collection, where, collectionGroup, limit} from "firebase/firestore";
import styles from '../../styles/design.module.css';
import DesignContent from "../../components/DesignContent";
import { useDocumentData } from 'react-firebase-hooks/firestore';

export async function getStaticProps({ params }) {
    console.log(params)

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
        const slug = doc.data().slug;
        const username = doc.data().username
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

    return (
        <main className={styles.container}>
            
            <section>
                <DesignContent design = {design}/>
            </section>

            <aside className = "card">
                <p>
                    <strong>{design.likeCount || 0} 🤍</strong>
                </p>
            </aside>
        </main>
    )
}
