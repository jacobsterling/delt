import Link from 'next/link';
import { useContext } from 'react';
import { UserContext } from '../lib/context';

export default function DesignFeed({ designs, admin }) {
    return designs ? designs.map((design) => <Showcase design={design} key={design.slug} admin={admin} />) :null;
}

function Showcase({ design, admin = false }) {

  const { user, username } = useContext(UserContext)

    return(
        <div className="card">
            <Link href={`/${username}`}>
                <a>
                    <strong>By @{username}</strong>
                </a>
            </Link>

            <Link href={`/${design.username}/${design.slug}`}>
                <h2>
                    <a>{design.title}</a>
                </h2>
            </Link>

            <footer>
            <span className="push-left">💗 {design.likeCount || 0}   Likes</span>
            </footer>

            {/* If admin view, show extra controls for user */}
      {admin && (
        <>
          <Link href={`/admin/${design.slug}`}>
            <h3>
              <button className="btn-blue">Edit</button>
            </h3>
          </Link>

          {design.published ? <p className="text-success">Live</p> : <p className="text-danger">Unpublished</p>}
        </>
      )}
        </div>
    );
}

