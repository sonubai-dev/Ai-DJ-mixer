import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useState, useEffect } from 'react';
import { LogIn, LogOut, User } from 'lucide-react';

export function AuthButton() {
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
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
              <User size={16} />
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
      <span>Sign In</span>
    </button>
  );
}
