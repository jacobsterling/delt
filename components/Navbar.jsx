import Link from 'next/link';
import { useContext } from 'react';
import { UserContext } from '../lib/context';
import { SignOutButton, SignInButton } from './Buttons';

// Top navbar
export default function Navbar() {

    const { user, username } = useContext(UserContext)

    return (
      <nav className="navbar">
        <div>
            <Link href="/">
              <button className="btn-logo">DELT</button>
            </Link>
        </div>
        <ul>
  
          {/* user is signed-in and has username */}
          {username && (
            <>
              <li className="push-left">
                <SignOutButton />
              </li>
              <li className="push-left">
                <Link href="/admin">
                  <button className="btn-blue">Mint</button>
                </Link>
              </li>
              <li>
                <Link href={`/${username}`}>
                  <img src={user?.photoURL} />
                </Link>
              </li>
            </>
          )}
          {/* user is not signed OR has not created username */}
          {!username && (
            <li>
              <Link href="/enter">
                <button className="btn-blue">Log in</button>
              </Link>
            </li>
          )}
        </ul>
      </nav>
    );
  }

