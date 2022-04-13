import { db, designToJSON, getUserWithUsername } from "../../lib/firebase";
import { query, doc, getDoc, getDocs, collection, where, orderBy, limit, collectionGroup, getDocsFromCache } from "firebase/firestore";
import styles from '../../styles/design.module.css';

export async function getStaticProps({ params }) {
    const { username, slug }  = params;
    const userDoc = await getUserWithUsername(username);

    let design;
    let path;

    if (userDoc) {
        console.log('userDoc',userDoc.docs[0].ref)
        const designRef = collection(userDoc.docs[0].ref,'designs');
        const designsQuery = query(designRef,where('slug', '==', slug))
    // .limit(5)
        const designSnapshot = await getDocs(designsQuery);
        design = designSnapshot.docs.map(designToJSON);
        path = designRef.path;
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

    return (
        <main className={styles.container}>
            
        </main>

    )
}
