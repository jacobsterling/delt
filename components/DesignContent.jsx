import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import fromMillis from '../lib/firebase'
import { Timestamp } from "firebase/firestore";

// UI component for main post content
export default function DesignContent({ design }) {
  const createdAt = typeof design?.createdAt === 'number' ? new Date(design.createdAt) : Timestamp.fromMillis(design.createdAt).toDate();
  
  return (
    <div className="card">
      <h1>{design?.title}</h1>
      <span className="text-sm">
        Written by{' '}
        <Link href={`/${design.username}/`}>
          <a className="text-info">@{design.username}</a>
        </Link>{' '}
        on {createdAt.toString()}
      </span>
      <ReactMarkdown>{design?.content}</ReactMarkdown>
    </div>
  );
}
