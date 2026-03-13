import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  CreditCard, 
  Shield, 
  User, 
  Music, 
  Download, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  DollarSign,
  BarChart3
} from 'lucide-react';
import { MixPreset } from './PresetList';

interface DashboardProps {
  onBack: () => void;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  artistName?: string;
  plan?: 'free' | 'pro' | 'studio';
  createdAt?: any;
}

export function Dashboard({ onBack }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'plans' | 'policies' | 'profile'>('history');
  const [mixes, setMixes] = useState<MixPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [artistNameInput, setArtistNameInput] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      // Fetch User Profile
      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profileData) {
        setProfile({ uid: profileData.id, ...profileData });
        setArtistNameInput(profileData.artistName || '');
      }

      // Fetch Mix History
      const { data: mixesData } = await supabase
        .from('mixes')
        .select('*')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false });
        
      if (mixesData) {
        setMixes(mixesData as MixPreset[]);
      }
      setLoading(false);
    };

    fetchDashboardData();

    // Set up realtime subscription for mixes
    let channel: any;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        channel = supabase
          .channel('public:mixes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'mixes', filter: `userId=eq.${session.user.id}` }, () => {
            fetchDashboardData();
          })
          .subscribe();
      }
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const handleSaveProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    
    setIsSavingProfile(true);
    try {
      await supabase
        .from('users')
        .update({ artistName: artistNameInput })
        .eq('id', session.user.id);
        
      setProfile(prev => prev ? { ...prev, artistName: artistNameInput } : null);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error("Error updating profile:", error);
      alert('Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpgrade = async (plan: 'pro' | 'studio') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    
    const amount = plan === 'pro' ? 5 : 15;
    const planName = plan.toUpperCase();

    try {
      // 1. Create Order on Backend
      const orderResponse = await fetch('/api/payments/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency: 'USD',
          receipt: `receipt_${session.user.id}_${Date.now()}`
        })
      });

      if (!orderResponse.ok) throw new Error('Failed to create payment order');
      const order = await orderResponse.json();

      // 2. Initialize Razorpay Checkout
      const options = {
        key: (import.meta.env.VITE_RAZORPAY_KEY_ID as string) || '', // Public Key
        amount: order.amount,
        currency: order.currency,
        name: "Indian Remix Studio",
        description: `Upgrade to ${planName} Plan`,
        order_id: order.id,
        handler: async (response: any) => {
          // 3. Verify Payment on Backend
          const verifyResponse = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });

          const verifyData = await verifyResponse.json();
          if (verifyData.success) {
            // 4. Update User Plan in Supabase
            await supabase
              .from('users')
              .update({ plan })
              .eq('id', session.user.id);
              
            setProfile(prev => prev ? { ...prev, plan } : null);
            alert(`Successfully upgraded to ${planName} plan!`);
          } else {
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: profile?.displayName || '',
          email: profile?.email || '',
        },
        theme: {
          color: "#f97316",
        },
      };

      // Load Razorpay script dynamically
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      };
      document.body.appendChild(script);

    } catch (error) {
      console.error("Error upgrading plan:", error);
      alert('Failed to initiate payment. Please try again.');
    }
  };

  const tabs = [
    { id: 'history', label: 'Mix History', icon: History },
    { id: 'plans', label: 'Plans & Pricing', icon: CreditCard },
    { id: 'policies', label: 'Policies & Copyright', icon: Shield },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-black text-white font-rajdhani p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-orbitron font-bold text-orange-500">Creator Dashboard</h2>
          <button 
            onClick={onBack}
            className="px-4 py-2 bg-gray-800 hover:bg-orange-600 text-white rounded-lg transition-colors font-bold tracking-wide border border-white/10"
          >
            Back to Studio
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-bold tracking-wide ${
                  activeTab === tab.id 
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' 
                    : 'bg-gray-900/50 text-gray-400 hover:bg-gray-800 hover:text-orange-400'
                }`}
              >
                <tab.icon size={20} />
                {tab.label}
              </button>
            ))}

            {/* Quick Stats Card */}
            <div className="mt-8 bg-gray-900 border border-white/10 rounded-xl p-6">
              <h4 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">Quick Stats</h4>
              <div className="space-y-4">
                <div>
                  <p className="text-2xl font-orbitron text-white">{mixes.length}</p>
                  <p className="text-xs text-gray-500">Total Mixes Created</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-3 bg-gray-900/50 border border-white/10 rounded-2xl p-6 md:p-8 min-h-[600px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'history' && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-orbitron text-white mb-6 flex items-center gap-2">
                      <History className="text-orange-500" /> Mix History
                    </h3>
                    
                    {loading ? (
                      <div className="text-center py-12 text-gray-500">Loading history...</div>
                    ) : mixes.length === 0 ? (
                      <div className="text-center py-12 bg-black/20 rounded-xl border border-white/5">
                        <Music size={48} className="mx-auto text-gray-700 mb-4" />
                        <p className="text-gray-400">No mixes created yet. Start remixing!</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {mixes.map((mix) => (
                          <div key={mix.id} className="bg-black/40 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:border-orange-500/30 transition-colors group">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center text-orange-500 font-orbitron font-bold text-lg">
                                {mix.mode.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-bold text-white group-hover:text-orange-400 transition-colors">{mix.name}</h4>
                                <p className="text-xs text-gray-500 flex items-center gap-2">
                                  <Calendar size={12} />
                                  {new Date(mix.createdAt).toLocaleDateString()} at {new Date(mix.createdAt).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right hidden md:block">
                                <p className="text-xs text-gray-400 uppercase tracking-wider">{mix.mode} Mode</p>
                                <p className="text-xs text-gray-500">{mix.tracks.length} Tracks</p>
                              </div>
                              <button className="p-2 bg-white/5 hover:bg-orange-600 text-gray-400 hover:text-white rounded-lg transition-all">
                                <Download size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'plans' && (
                  <div className="space-y-8">
                    <h3 className="text-2xl font-orbitron text-white mb-6 flex items-center gap-2">
                      <CreditCard className="text-orange-500" /> Plans & Pricing
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Free Plan */}
                      <div className={`bg-black/40 border rounded-2xl p-6 flex flex-col ${profile?.plan === 'free' || !profile?.plan ? 'border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.1)]' : 'border-white/10'}`}>
                        <div className="mb-4">
                          <h4 className="text-xl font-orbitron text-white">Starter</h4>
                          <p className="text-3xl font-bold text-white mt-2">$0<span className="text-sm text-gray-500 font-normal">/mo</span></p>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                          <li className="flex items-center gap-2 text-sm text-gray-300"><CheckCircle2 size={16} className="text-orange-500" /> 5 Remixes per day</li>
                          <li className="flex items-center gap-2 text-sm text-gray-300"><CheckCircle2 size={16} className="text-orange-500" /> Standard Quality (128kbps)</li>
                          <li className="flex items-center gap-2 text-sm text-gray-300"><CheckCircle2 size={16} className="text-orange-500" /> Basic DJ Effects</li>
                        </ul>
                        <button className="w-full py-3 rounded-lg font-bold bg-white/10 text-gray-400 cursor-default">Current Plan</button>
                      </div>

                      {/* Pro Plan */}
                      <div className={`bg-gray-800/50 border rounded-2xl p-6 flex flex-col relative overflow-hidden ${profile?.plan === 'pro' ? 'border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.1)]' : 'border-white/10'}`}>
                        {profile?.plan === 'pro' && <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">ACTIVE</div>}
                        <div className="mb-4">
                          <h4 className="text-xl font-orbitron text-orange-400">Pro Creator</h4>
                          <p className="text-3xl font-bold text-white mt-2">$5<span className="text-sm text-gray-500 font-normal">/mo</span></p>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                          <li className="flex items-center gap-2 text-sm text-white"><CheckCircle2 size={16} className="text-orange-500" /> Unlimited Remixes</li>
                          <li className="flex items-center gap-2 text-sm text-white"><CheckCircle2 size={16} className="text-orange-500" /> High Quality (320kbps)</li>
                          <li className="flex items-center gap-2 text-sm text-white"><CheckCircle2 size={16} className="text-orange-500" /> Advanced AI Tools</li>
                          <li className="flex items-center gap-2 text-sm text-white"><CheckCircle2 size={16} className="text-orange-500" /> Commercial License</li>
                        </ul>
                        {profile?.plan === 'pro' ? (
                          <button className="w-full py-3 rounded-lg font-bold bg-orange-600 text-white cursor-default">Current Plan</button>
                        ) : (
                          <button onClick={() => handleUpgrade('pro')} className="w-full py-3 rounded-lg font-bold bg-white text-black hover:bg-orange-500 hover:text-white transition-colors">Upgrade to Pro</button>
                        )}
                      </div>

                      {/* Studio Plan */}
                      <div className={`bg-gradient-to-b from-gray-800 to-black border rounded-2xl p-6 flex flex-col relative overflow-hidden ${profile?.plan === 'studio' ? 'border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.1)]' : 'border-purple-500/30'}`}>
                        {profile?.plan === 'studio' && <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">ACTIVE</div>}
                        <div className="mb-4">
                          <h4 className="text-xl font-orbitron text-purple-400">Studio Elite</h4>
                          <p className="text-3xl font-bold text-white mt-2">$15<span className="text-sm text-gray-500 font-normal">/mo</span></p>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                          <li className="flex items-center gap-2 text-sm text-white"><CheckCircle2 size={16} className="text-purple-500" /> Everything in Pro</li>
                          <li className="flex items-center gap-2 text-sm text-white"><CheckCircle2 size={16} className="text-purple-500" /> Lossless WAV Export</li>
                          <li className="flex items-center gap-2 text-sm text-white"><CheckCircle2 size={16} className="text-purple-500" /> Stem Separation</li>
                          <li className="flex items-center gap-2 text-sm text-white"><CheckCircle2 size={16} className="text-purple-500" /> Priority Support</li>
                        </ul>
                        {profile?.plan === 'studio' ? (
                          <button className="w-full py-3 rounded-lg font-bold bg-purple-600 text-white cursor-default">Current Plan</button>
                        ) : (
                          <button onClick={() => handleUpgrade('studio')} className="w-full py-3 rounded-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-orange-500 hover:to-red-500 text-white transition-all">Get Studio Access</button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'policies' && (
                  <div className="space-y-8">
                    <h3 className="text-2xl font-orbitron text-white mb-6 flex items-center gap-2">
                      <Shield className="text-orange-500" /> Policies & Copyright
                    </h3>

                    <div className="space-y-6">
                      <div className="bg-black/40 border border-white/10 rounded-xl p-6">
                        <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                          <AlertCircle size={18} className="text-orange-500" /> Copyright Disclaimer
                        </h4>
                        <p className="text-gray-400 text-sm leading-relaxed">
                          All remixes created on Indian Remix Studio are subject to the copyright laws of the respective original content owners. 
                          Users are responsible for obtaining necessary clearances for commercial distribution. The platform provides tools for 
                          creative expression but does not grant ownership of the underlying musical compositions.
                        </p>
                      </div>

                      <div className="bg-black/40 border border-white/10 rounded-xl p-6">
                        <h4 className="text-lg font-bold text-white mb-3">Usage Rights</h4>
                        <ul className="space-y-3 text-sm text-gray-400">
                          <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2"></span>
                            <span><strong>Personal Use:</strong> You may freely use your remixes for personal listening and private parties.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2"></span>
                            <span><strong>Social Media:</strong> Sharing on platforms like YouTube/Instagram may be subject to Content ID claims by original rights holders.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2"></span>
                            <span><strong>Commercial Use:</strong> Requires a Pro or Studio plan AND separate mechanical licenses from copyright holders.</span>
                          </li>
                        </ul>
                      </div>

                      <div className="bg-black/40 border border-white/10 rounded-xl p-6">
                        <h4 className="text-lg font-bold text-white mb-3">Platform Policy</h4>
                        <p className="text-gray-400 text-sm leading-relaxed">
                          We have a zero-tolerance policy for hate speech, harassment, or illegal content. 
                          Accounts found violating these terms will be suspended immediately. 
                          Remixes that infringe on major label copyrights may be taken down upon request.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'profile' && (
                  <div className="space-y-8">
                    <h3 className="text-2xl font-orbitron text-white mb-6 flex items-center gap-2">
                      <User className="text-orange-500" /> Profile
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-black/40 border border-white/10 rounded-xl p-6">
                        <h4 className="text-lg font-bold text-white mb-6">Artist Profile</h4>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Display Name</label>
                            <input 
                              type="text" 
                              value={profile?.displayName || ''} 
                              disabled 
                              className="w-full bg-gray-900 border border-white/10 rounded-lg px-4 py-3 text-gray-400 cursor-not-allowed"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs text-orange-500 uppercase tracking-wider mb-2 font-bold">Artist / Profit Name</label>
                            <input 
                              type="text" 
                              value={artistNameInput}
                              onChange={(e) => setArtistNameInput(e.target.value)}
                              placeholder="Enter your artist name"
                              className="w-full bg-gray-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none transition-colors"
                            />
                            <p className="text-xs text-gray-500 mt-2">This name will appear on your public remixes and invoices.</p>
                          </div>

                          <button 
                            onClick={handleSaveProfile}
                            disabled={isSavingProfile}
                            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-lg transition-colors mt-4"
                          >
                            {isSavingProfile ? 'Saving...' : 'Save Profile'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
