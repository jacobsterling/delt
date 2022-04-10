import { auth, provider } from '../lib/firebase';
import { signInWithPopup } from "firebase/auth";

// Sign out button
export function SignOutButton() {
    return <button onClick={() => auth.signOut()}>Sign Out</button>;
}

// Sign in with Google button
export function SignInButton() {
    const signInWithGoogle = async () => {
      await signInWithPopup(auth,provider)
    };
    return (
        <button className="btn-google" onClick={signInWithGoogle}>
          <img src={'/google.png'} width="30px" /> Sign in with Google
        </button>
    );
}