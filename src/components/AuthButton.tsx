import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { LogIn, LogOut, User as UserIcon } from 'lucide-react';

export function AuthButton() {
  const [user, setUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (user) {
        // Check if user exists in Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          // Create new user document
          const userData: any = {
            uid: user.uid,
            email: user.email,
            createdAt: serverTimestamp()
          };

          if (user.displayName) {
            userData.displayName = user.displayName.substring(0, 49);
          }
          
          if (user.photoURL) {
            userData.photoURL = user.photoURL;
          }

          await setDoc(userDocRef, userData);
        }
      }
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full border border-white/20" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <UserIcon size={16} />
            </div>
          )}
          <span className="hidden sm:inline text-sm font-rajdhani text-gray-300">{user.displayName}</span>
        </div>
        <button
          onClick={handleLogout}
          className="bg-white/5 hover:bg-white/10 text-white p-2 rounded-lg transition-colors"
          title="Sign Out"
        >
          <LogOut size={18} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-orbitron text-sm flex items-center gap-2 shadow-[0_0_10px_rgba(255,107,26,0.3)] transition-all"
    >
      <LogIn size={16} />
      <span>Sign Up / Login</span>
    </button>
  );
}
