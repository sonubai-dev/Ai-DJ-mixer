import { useState, useRef, useEffect } from 'react';
import { UploadZone } from './components/UploadZone';
import { TrackList } from './components/TrackList';
import { ModeSelector } from './components/ModeSelector';
import { SettingsPanel } from './components/SettingsPanel';
import { Visualizer } from './components/Visualizer';
import { Hero } from './components/Hero';
import { PresetList, MixPreset } from './components/PresetList';
import { MusicPlayer } from './components/MusicPlayer';
import { useAudioProcessor } from './hooks/useAudioProcessor';
import { AudioTrack, RemixMode, RemixSettings } from './types';
import { audioBufferToWav } from './utils/encodeWAV';
import { detectBPM } from './utils/bpmDetection';
import { generateDJTitle, guessBPMFromMetadata, getTrendBasedRemixSettings, analyzeSongStructure, TrendRemixResponse, SongStructureAnalysis } from './services/aiService';
import { Play, Pause, Download, Wand2, Loader2, Save, Sparkles, LayoutDashboard, BrainCircuit, X, Music, Mic2, Activity, ListChecks, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './supabase';
import { Dashboard } from './components/Dashboard';
import { AuthButton } from './components/AuthButton';
import { InfoModal, InfoPage } from './components/InfoModal';

interface UserProfile {
  uid: string;
  email?: string;
}

function App() {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [activeMode, setActiveMode] = useState<RemixMode>('dj');
  const [settings, setSettings] = useState<RemixSettings>({
    bassBoost: 6,
    bass: 0,
    treble: 0,
    echoDelay: 0,
    echoFeedback: 0,
    slowFactor: 85,
    reverbWet: 30,
    reverbSize: 2.5,
    panningSpeed: 8,
    crossfadeDuration: 5,
    aiMastering: true,
    masteringHighEndBoost: 1.5,
    masteringLowEndTighten: -2.5,
    masteringVocalPresence: 2.0,
    masteringLimiterThreshold: -0.8,
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzingTrends, setIsAnalyzingTrends] = useState(false);
  const [isAnalyzingStructure, setIsAnalyzingStructure] = useState(false);
  const [detectingBPMId, setDetectingBPMId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'studio' | 'dashboard'>('studio');
  const [infoPage, setInfoPage] = useState<InfoPage>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const [trendResult, setTrendResult] = useState<TrendRemixResponse | null>(null);
  const [structureAnalysis, setStructureAnalysis] = useState<SongStructureAnalysis | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  const { processAudio, isProcessing, processedBuffer, audioContext, decodeAudio } = useAudioProcessor();
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (audioContext && !analyserRef.current) {
      analyserRef.current = audioContext.createAnalyser();
      analyserRef.current.fftSize = 256;
    }
  }, [audioContext]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user;
      if (user) {
        const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
        if (data) {
          setUserProfile({ uid: user.id, ...data });
        } else {
          const newProfile = { id: user.id, email: user.email };
          await supabase.from('users').insert([newProfile]);
          setUserProfile({ uid: user.id });
        }
      } else {
        setUserProfile(null);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user;
      if (user) {
        const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
        if (data) {
          setUserProfile({ uid: user.id, ...data });
        } else {
          const newProfile = { id: user.id, email: user.email };
          await supabase.from('users').upsert([newProfile]);
          setUserProfile({ uid: user.id });
        }
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleFileUpload = async (files: File[]) => {
    const newTracks = await Promise.all(files.map(async (file) => {
      let duration = 0;
      try {
        const audio = new Audio(URL.createObjectURL(file));
        await new Promise((resolve) => {
          audio.onloadedmetadata = () => {
            duration = audio.duration;
            resolve(null);
          };
          audio.onerror = () => resolve(null);
        });
      } catch (e) {
        console.error("Error getting duration", e);
      }

      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
        duration,
        status: 'uploaded' as const
      };
    }));
    
    setTracks((prev) => [...prev, ...newTracks]);
  };

  const handleReplaceTrack = async (id: string, file: File) => {
    let duration = 0;
    try {
      const audio = new Audio(URL.createObjectURL(file));
      await new Promise((resolve) => {
        audio.onloadedmetadata = () => {
          duration = audio.duration;
          resolve(null);
        };
        audio.onerror = () => resolve(null);
      });
    } catch (e) {
      console.error("Error getting duration", e);
    }

    setTracks((prev) => prev.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          file,
          duration,
          status: 'uploaded',
          buffer: undefined
        };
      }
      return t;
    }));
  };

  const handleRemoveTrack = (id: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleUpdateGenre = (id: string, genre: string) => {
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, genre } : t)));
  };

  const handleDetectBPM = async (id: string) => {
    const track = tracks.find(t => t.id === id);
    if (!track) return;

    setDetectingBPMId(id);
    let bpm: number | null = null;

    try {
      // 1. Try Client-side detection first
      if (!track.buffer) {
        const buffer = await decodeAudio(track.file);
        if (buffer) {
           setTracks(prev => prev.map(t => t.id === id ? { ...t, buffer, duration: buffer.duration } : t));
           bpm = await detectBPM(buffer);
        }
      } else {
        bpm = await detectBPM(track.buffer);
      }

      // 2. If client-side fails or returns weird value, try AI Guess (Gemini)
      if (!bpm || bpm < 40 || bpm > 200) {
        console.log("Client-side BPM detection uncertain, trying AI guess...");
        const aiBpm = await guessBPMFromMetadata(track.name);
        if (aiBpm) bpm = aiBpm;
      }

      if (bpm) {
        setTracks(prev => prev.map(t => t.id === id ? { ...t, bpm: bpm! } : t));
      } else {
        alert('Could not detect BPM. Try renaming the file to include the song title.');
      }

    } catch (error) {
      console.error("BPM Detection Error", error);
      alert('Error detecting BPM');
    } finally {
      setDetectingBPMId(null);
    }
  };

  const handleAITrendAnalysis = async () => {
    if (tracks.length === 0) return;
    setIsAnalyzingTrends(true);
    try {
      const result = await getTrendBasedRemixSettings(tracks.map(t => ({ name: t.name, genre: t.genre })));
      if (result) {
        setTrendResult(result);
        setActiveMode(result.mode);
        setSettings({
          ...result.settings,
          echoDelay: 0,
          echoFeedback: 0,
          bass: result.settings.bass ?? 0,
          treble: result.settings.treble ?? 0,
          aiMastering: result.settings.aiMastering ?? true,
          masteringHighEndBoost: result.settings.masteringHighEndBoost ?? 1.5,
          masteringLowEndTighten: result.settings.masteringLowEndTighten ?? -2.5,
          masteringVocalPresence: result.settings.masteringVocalPresence ?? 2.0,
          masteringLimiterThreshold: result.settings.masteringLimiterThreshold ?? -0.8,
        });
        alert(`AI Analysis Complete!\n\nMode selected: ${result.mode}\n\n${result.explanation}`);
      } else {
        alert('Failed to analyze trends. Please try again.');
      }
    } catch (error) {
      console.error(error);
      alert('Error analyzing trends');
    } finally {
      setIsAnalyzingTrends(false);
    }
  };

  const handleProcess = async () => {
    if (tracks.length === 0) return;
    
    try {
      // Process audio client-side
      await processAudio(tracks, activeMode, settings);
    } catch (error) {
      console.error(error);
      alert('Processing failed');
    }
  };

  const handleDownload = () => {
    if (!processedBuffer) return;

    const wavBuffer = audioBufferToWav(processedBuffer);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    
    const lang = tracks[0]?.genre || 'Unknown';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `IndianDJMix_${activeMode}_${lang}_${timestamp}.wav`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const handleGenerateTitle = async () => {
    const lang = tracks[0]?.genre || 'Hindi';
    setIsGeneratingTitle(true);
    const title = await generateDJTitle(lang, activeMode);
    setGeneratedTitle(title);
    setIsGeneratingTitle(false);
  };

  const handleSaveMix = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      alert('Please sign in to save mixes');
      return;
    }

    const name = prompt('Enter a name for this preset:', generatedTitle || `Mix ${new Date().toLocaleString()}`);
    if (!name) return;
    
    setIsSaving(true);
    try {
      await supabase.from('mixes').insert([{
        userId: session.user.id,
        name: name,
        mode: activeMode,
        settings,
        tracks: tracks.map(t => ({ name: t.name, genre: t.genre || 'Unknown' }))
      }]);
      alert('Mix preset saved successfully!');
    } catch (error) {
      console.error('Error saving mix:', error);
      alert('Failed to save mix');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadPreset = (preset: MixPreset) => {
    setActiveMode(preset.mode);
    // Ensure echo settings remain 0 as requested, and provide defaults for new EQ settings
    setSettings({ 
      ...preset.settings, 
      echoDelay: 0, 
      echoFeedback: 0,
      bass: preset.settings.bass ?? 0,
      treble: preset.settings.treble ?? 0,
      aiMastering: preset.settings.aiMastering ?? true,
      masteringHighEndBoost: preset.settings.masteringHighEndBoost ?? 1.5,
      masteringLowEndTighten: preset.settings.masteringLowEndTighten ?? -2.5,
      masteringVocalPresence: preset.settings.masteringVocalPresence ?? 2.0,
      masteringLimiterThreshold: preset.settings.masteringLimiterThreshold ?? -0.8,
    });
    alert(`Loaded settings for "${preset.name}". \nMode: ${preset.mode}\n\nNote: Original audio files cannot be restored automatically. Please upload tracks to apply these settings.`);
  };

  if (currentView === 'dashboard') {
    return <Dashboard onBack={() => setCurrentView('studio')} />;
  }

  return (
    <div className="min-h-screen bg-bg text-white font-sans selection:bg-primary selection:text-white pb-20 relative">
      {/* Header */}
      <header className="border-b border-white/10 bg-bg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.4)] ring-1 ring-white/20">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black font-display tracking-tight text-white drop-shadow-lg">
                AI DJ Mixer
              </h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
             <button 
               onClick={() => setCurrentView('dashboard')}
               className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-primary text-white rounded-lg transition-all font-medium border border-white/10 hover:border-primary/50"
             >
               <LayoutDashboard size={18} />
               <span className="hidden sm:inline">Dashboard</span>
             </button>
             <AuthButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {tracks.length === 0 && (
          <Hero 
            onUploadClick={() => {
              const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
              if (fileInput) fileInput.click();
            }}
            onDemoClick={() => {
              // Demo functionality can be added here
              alert("Demo mode coming soon!");
            }}
            onEffectsClick={() => {
              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }}
          />
        )}
        
        <ModeSelector activeMode={activeMode} onModeChange={setActiveMode} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Input & Tracks */}
          <div className="lg:col-span-2 space-y-8">
            <UploadZone 
              onFileUpload={handleFileUpload} 
            />
            
            <TrackList 
              tracks={tracks} 
              onRemoveTrack={handleRemoveTrack} 
              onUpdateGenre={handleUpdateGenre}
              onDetectBPM={handleDetectBPM}
              onReplaceTrack={handleReplaceTrack}
              detectingBPMId={detectingBPMId}
            />
          </div>

          {/* Right Column: Settings & Actions */}
          <div className="space-y-8">
            <SettingsPanel 
              mode={activeMode} 
              settings={settings} 
              onSettingsChange={setSettings} 
              tracks={tracks}
            />

            {/* Action Card */}
            <div className="bg-secondary border border-white/10 rounded-xl p-6">
              <h3 className="text-xl font-display font-bold text-white mb-4">Actions</h3>
              
              <button
                onClick={handleAITrendAnalysis}
                disabled={tracks.length === 0 || isAnalyzingTrends}
                className="w-full mb-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                {isAnalyzingTrends ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>ANALYZING...</span>
                  </>
                ) : (
                  <>
                    <BrainCircuit size={18} />
                    <span>AI AUTO-MASTER & REMIX</span>
                  </>
                )}
              </button>

              <button
                onClick={handleProcess}
                disabled={tracks.length === 0 || isProcessing}
                className="w-full mb-4 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-lg font-bold shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" />
                    <span>PROCESSING...</span>
                  </>
                ) : (
                  <span>PROCESS MIX</span>
                )}
              </button>

              {processedBuffer && audioContext && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <MusicPlayer
                    audioContext={audioContext}
                    processedBuffer={processedBuffer}
                    analyserNode={analyserRef.current}
                    onDownload={handleDownload}
                    onPlayStateChange={setIsPlaying}
                    isProcessing={isProcessing}
                    trackTitle={generatedTitle || (tracks.length > 0 ? `${tracks[0].name} (${activeMode} mix)` : 'Custom Mix')}
                  />

                  <div className="pt-4 border-t border-white/10 space-y-2">
                    <button
                      onClick={handleGenerateTitle}
                      disabled={isGeneratingTitle}
                      className="w-full text-sm text-gray-400 hover:text-white flex items-center justify-center space-x-2 transition-colors"
                    >
                      <Wand2 size={14} />
                      <span>{isGeneratingTitle ? 'Generating...' : 'Generate AI Title'}</span>
                    </button>
                    
                    <button
                      onClick={handleSaveMix}
                      disabled={isSaving}
                      className="w-full text-sm text-gray-400 hover:text-white flex items-center justify-center space-x-2 transition-colors"
                    >
                      {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      <span>Save Mix Preset</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Visualizer (Full Width) */}
        <div className="mt-8">
           <Visualizer 
             analyser={analyserRef.current} 
             isPlaying={isPlaying} 
           />
        </div>

        {/* Saved Presets */}
        <PresetList onLoadPreset={handleLoadPreset} />

      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-secondary/50 mt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="text-primary" size={24} />
                <h2 className="text-xl font-display font-bold text-white">AI DJ Mixer</h2>
              </div>
              <p className="text-gray-400 max-w-sm">
                Professional AI-powered audio conversion and DJ mixing tools. Create unique sounds with advanced effects.
              </p>
            </div>
            <div>
              <h3 className="text-white font-bold mb-4">Features</h3>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-primary transition-colors">Slowed + Reverb</button></li>
                <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-primary transition-colors">8D Audio</button></li>
                <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-primary transition-colors">Nightcore</button></li>
                <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-primary transition-colors">Bass Boost</button></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => setInfoPage('about')} className="hover:text-primary transition-colors">About</button></li>
                <li><button onClick={() => setInfoPage('contact')} className="hover:text-primary transition-colors">Contact</button></li>
                <li><a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">GitHub</a></li>
                <li><button onClick={() => setInfoPage('terms')} className="hover:text-primary transition-colors">Terms of Service</button></li>
                <li><button onClick={() => setInfoPage('privacy')} className="hover:text-primary transition-colors">Privacy Policy</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-12 pt-8 text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} AI DJ Mixer. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Info Modal */}
      <InfoModal page={infoPage} onClose={() => setInfoPage(null)} />

      {/* Analysis Modal */}
      <AnimatePresence>
        {showAnalysisModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-secondary border border-primary/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl shadow-primary/20 relative"
            >
              <button 
                onClick={() => setShowAnalysisModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <h3 className="text-2xl font-display font-bold text-white mb-6 flex items-center gap-2">
                <BrainCircuit className="text-primary" /> AI Analysis Report
              </h3>

              {isAnalyzingTrends || isAnalyzingStructure ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400 space-y-4">
                  <Loader2 className="animate-spin text-primary" size={48} />
                  <p>Analyzing audio patterns & trends...</p>
                </div>
              ) : (
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {trendResult && (
                    <div className="space-y-4">
                      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-primary font-bold uppercase tracking-wider text-sm">Trend Strategy</h4>
                          {trendResult.viralScore && (
                            <span className="bg-primary text-white text-xs font-bold px-2 py-1 rounded-full">
                              Viral Score: {trendResult.viralScore}/100
                            </span>
                          )}
                        </div>
                        <p className="text-white text-lg font-display font-bold mb-2 capitalize">{trendResult.mode.replace('-', ' + ')} Mode</p>
                        <p className="text-gray-300 text-sm leading-relaxed">{trendResult.explanation}</p>
                      </div>
                      <div className="text-xs text-gray-500 text-center">
                        Settings automatically applied to panel.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
