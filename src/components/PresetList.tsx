import { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { RemixSettings, RemixMode } from '../types';
import { Trash2, Play, Settings, Save } from 'lucide-react';

export interface MixPreset {
  id: string;
  name: string;
  mode: RemixMode;
  settings: RemixSettings;
  createdAt: string;
  tracks: { name: string; language: string }[];
}

interface PresetListProps {
  onLoadPreset: (preset: MixPreset) => void;
}

export function PresetList({ onLoadPreset }: PresetListProps) {
  const [presets, setPresets] = useState<MixPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setPresets([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'mixes'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedPresets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MixPreset[];
      
      // Sort client-side to avoid index requirement
      loadedPresets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setPresets(loadedPresets);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this preset?')) {
      await deleteDoc(doc(db, 'mixes', id));
    }
  };

  if (!user) return null;

  return (
    <div className="bg-gray-900 border border-white/10 rounded-xl p-6 mt-8">
      <h3 className="text-xl font-orbitron text-white mb-4 flex items-center gap-2">
        <Settings size={20} className="text-white" />
        Saved Presets
      </h3>
      
      {loading ? (
        <p className="text-gray-400">Loading presets...</p>
      ) : presets.length === 0 ? (
        <p className="text-gray-500 italic">No saved presets yet. Save your current mix to see it here.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {presets.map((preset) => (
            <div key={preset.id} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors group">
              <div className="flex justify-between items-start mb-2">
                <div className="overflow-hidden">
                  <h4 className="font-orbitron text-orange-400 truncate" title={preset.name}>{preset.name}</h4>
                  <p className="text-xs text-gray-400 font-rajdhani uppercase">{preset.mode} Mode</p>
                </div>
                <button 
                  onClick={() => handleDelete(preset.id)}
                  className="text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete Preset"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="text-xs text-gray-500 mb-3 font-rajdhani">
                {preset.tracks.length} tracks • {new Date(preset.createdAt).toLocaleDateString()}
              </div>

              <button
                onClick={() => onLoadPreset(preset)}
                className="w-full bg-white/10 hover:bg-orange-600 text-white py-2 rounded text-xs font-orbitron tracking-wider flex items-center justify-center gap-2 transition-colors"
              >
                <Play size={12} />
                LOAD SETTINGS
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
