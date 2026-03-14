import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabase';
import { LogIn, LogOut, User as UserIcon, X, Mail, Lock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function AuthButton() {
  const [user, setUser] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quirkyFact, setQuirkyFact] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setShowModal(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (showModal && !quirkyFact) {
      fetch('/api/quirky-facts')
        .then(res => res.json())
        .then(data => setQuirkyFact(data))
        .catch(console.error);
    }
  }, [showModal, quirkyFact]);

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) throw error;
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (user) {
    const photoURL = user.user_metadata?.avatar_url;
    const displayName = user.user_metadata?.full_name || user.email;

    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {photoURL ? (
            <img src={photoURL} alt={displayName} className="w-8 h-8 rounded-full border border-white/20" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <UserIcon size={16} />
            </div>
          )}
          <span className="hidden sm:inline text-sm font-sans text-gray-300">{displayName}</span>
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

  const modalContent = typeof document !== 'undefined' ? createPortal(
    <AnimatePresence>
      {showModal && (
        <motion.div
          key="auth-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            key="auth-modal-content"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-secondary border border-primary/30 rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-primary/20 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-2xl font-display font-bold text-white mb-6 text-center">
              {isLogin ? 'Welcome Back' : 'Join the Studio'}
            </h3>

            {quirkyFact && (
              <div className="mb-6 bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-2 text-primary mb-1">
                  <Sparkles size={14} />
                  <span className="text-xs font-bold uppercase tracking-wider">Quirky DJ Fact</span>
                </div>
                <p className="text-sm text-gray-300 italic">"{quirkyFact.fact}"</p>
                <p className="text-[10px] text-primary/60 mt-1">Weirdness Level: {quirkyFact.weirdness_level}/10</p>
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-bg/50 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-primary transition-colors"
                    placeholder="dj@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-bg/50 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-primary transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-white py-2 rounded-lg font-sans font-bold tracking-wider transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-secondary text-gray-500">Or continue with</span>
                </div>
              </div>

              <button
                onClick={handleGoogleLogin}
                className="mt-4 w-full bg-white text-black hover:bg-gray-200 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-gray-400">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:text-primary/80 font-bold"
              >
                {isLogin ? 'Sign Up' : 'Login'}
              </button>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  ) : null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-sans font-bold text-sm flex items-center gap-2 shadow-[0_0_10px_rgba(124,58,237,0.3)] transition-all"
      >
        <LogIn size={16} />
        <span>Sign Up / Login</span>
      </button>
      {modalContent}
    </>
  );
}
