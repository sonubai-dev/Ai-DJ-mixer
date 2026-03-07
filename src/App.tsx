import { useState, useRef, useEffect } from 'react';
import { UploadZone } from './components/UploadZone';
import { TrackList } from './components/TrackList';
import { ModeSelector } from './components/ModeSelector';
import { SettingsPanel } from './components/SettingsPanel';
import { Visualizer } from './components/Visualizer';
import { AuthButton } from './components/AuthButton';
import { PresetList, MixPreset } from './components/PresetList';
import { useAudioProcessor } from './hooks/useAudioProcessor';
import { AudioTrack, RemixMode, RemixSettings } from './types';
import { audioBufferToWav } from './utils/encodeWAV';
import { detectBPM } from './utils/bpmDetection';
import { generateDJTitle, guessBPMFromMetadata, getTrendBasedRemixSettings } from './services/aiService';
import { Play, Pause, Download, Wand2, Loader2, Save, Sparkles, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Dashboard } from './components/Dashboard';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

function App() {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [activeMode, setActiveMode] = useState<RemixMode>('dj');
  const [settings, setSettings] = useState<RemixSettings>({
    bassBoost: 6,
    echoDelay: 250,
    echoFeedback: 40,
    slowFactor: 85,
    reverbWet: 30,
    reverbSize: 2.5,
    panningSpeed: 8,
    crossfadeDuration: 5,
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzingTrends, setIsAnalyzingTrends] = useState(false);
  const [detectingBPMId, setDetectingBPMId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'studio' | 'dashboard'>('studio');
  
  const { processAudio, isProcessing, processedBuffer, audioContext, decodeAudio } = useAudioProcessor();
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (audioContext && !analyserRef.current) {
      analyserRef.current = audioContext.createAnalyser();
      analyserRef.current.fftSize = 256;
    }
  }, [audioContext]);

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

  const handleUpdateLanguage = (id: string, language: string) => {
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, language } : t)));
  };

  const handleDetectBPM = async (id: string) => {
    const track = tracks.find(t => t.id === id);
    if (!track) return;

    setDetectingBPMId(id);
    let bpm: number | null = null;

    try {
      // 1. Try Client-side detection first
      if (!track.buffer) {
        // We need to decode it first if not already decoded
        // Note: useAudioProcessor exposes decodeAudio but we need to make sure we can use it here
        // The hook exposes `decodeAudio` which returns AudioBuffer
        const buffer = await decodeAudio(track.file);
        if (buffer) {
           // Update track with buffer so we don't decode again
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

  const handleAutoTrendMix = async () => {
    if (tracks.length === 0) {
      alert("Please upload a track first.");
      return;
    }
    
    setIsAnalyzingTrends(true);
    
    try {
      const trackData = tracks.map(t => ({ name: t.name, language: t.language }));
      const result = await getTrendBasedRemixSettings(trackData);
      
      if (result) {
        setActiveMode(result.mode);
        setSettings(result.settings);
        alert(`AI Trend Analysis:\n\n${result.explanation}`);
      } else {
        alert("Could not analyze trends for this track.");
      }
    } catch (e) {
      console.error(e);
      alert("Error analyzing trends.");
    } finally {
      setIsAnalyzingTrends(false);
    }
  };

  const handleProcess = async () => {
    if (tracks.length === 0) return;
    
    // Stop current playback
    stopPlayback();

    try {
      await processAudio(tracks, activeMode, settings);
    } catch (error) {
      console.error(error);
      alert('Processing failed');
    }
  };

  const playAudio = () => {
    if (!processedBuffer || !audioContext) return;

    if (isPlaying) {
      // Pause
      stopPlayback();
      pauseTimeRef.current = audioContext.currentTime - startTimeRef.current;
      setIsPlaying(false);
    } else {
      // Play
      const source = audioContext.createBufferSource();
      source.buffer = processedBuffer;
      
      if (analyserRef.current) {
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioContext.destination);
      } else {
        source.connect(audioContext.destination);
      }
      
      source.start(0, pauseTimeRef.current % processedBuffer.duration);
      startTimeRef.current = audioContext.currentTime - (pauseTimeRef.current % processedBuffer.duration);
      
      sourceNodeRef.current = source;
      setIsPlaying(true);
      
      source.onended = () => {
        setIsPlaying(false);
        pauseTimeRef.current = 0;
      };
    }
  };

  const stopPlayback = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) { /* ignore */ }
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleDownload = () => {
    if (!processedBuffer) return;
    const wavBuffer = audioBufferToWav(processedBuffer);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    
    const lang = tracks[0]?.language || 'Unknown';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `IndianDJMix_${activeMode}_${lang}_${timestamp}.wav`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const handleGenerateTitle = async () => {
    const lang = tracks[0]?.language || 'Hindi';
    setIsGeneratingTitle(true);
    const title = await generateDJTitle(lang, activeMode);
    setGeneratedTitle(title);
    setIsGeneratingTitle(false);
  };

  const handleSaveMix = async () => {
    if (!auth.currentUser) {
      alert('Please sign in to save mixes');
      return;
    }

    const name = prompt('Enter a name for this preset:', generatedTitle || `Mix ${new Date().toLocaleString()}`);
    if (!name) return;
    
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'mixes'), {
        userId: auth.currentUser.uid,
        name: name,
        mode: activeMode,
        settings,
        tracks: tracks.map(t => ({ name: t.name, language: t.language || 'Unknown' })),
        createdAt: new Date().toISOString()
      });
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
    setSettings(preset.settings);
    // We can't load the actual audio files, but we can alert the user
    alert(`Loaded settings for "${preset.name}". \nMode: ${preset.mode}\n\nNote: Original audio files cannot be restored automatically. Please upload tracks to apply these settings.`);
  };

  if (currentView === 'dashboard') {
    return <Dashboard onBack={() => setCurrentView('studio')} />;
  }

  return (
    <div className="min-h-screen bg-black text-white font-rajdhani selection:bg-orange-500 selection:text-white pb-20">
      {/* Header */}
      <header className="border-b border-white/10 bg-black sticky top-0 z-50 shadow-lg shadow-orange-900/10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-orange-600 text-white rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(234,88,12,0.4)] ring-1 ring-white/20">
              <span className="font-orbitron font-bold text-2xl drop-shadow-md">DJ</span>
            </div>
            <div>
              <h1 className="text-3xl font-black font-orbitron tracking-widest text-white drop-shadow-lg">
                INDIAN REMIX STUDIO
              </h1>
              <p className="text-xs text-orange-500 font-rajdhani font-bold tracking-[0.2em] uppercase">AI-Powered Production Suite</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
             <button 
               onClick={() => setCurrentView('dashboard')}
               className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-orange-600 text-white rounded-lg transition-all font-bold tracking-wide border border-white/10 hover:border-orange-500/50"
             >
               <LayoutDashboard size={18} />
               <span className="hidden sm:inline">Dashboard</span>
             </button>
             <AuthButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        
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
              onUpdateLanguage={handleUpdateLanguage}
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
            <div className="bg-gray-900 border border-white/10 rounded-xl p-6">
              <h3 className="text-xl font-orbitron text-white mb-4">Actions</h3>
              
              <button
                onClick={handleAutoTrendMix}
                disabled={tracks.length === 0 || isAnalyzingTrends || isProcessing}
                className="w-full mb-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-orbitron font-bold tracking-widest shadow-[0_0_15px_rgba(124,58,237,0.4)] transition-all flex items-center justify-center space-x-2"
              >
                {isAnalyzingTrends ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>ANALYZING TRENDS...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>AUTO-MIX (AI TRENDS)</span>
                  </>
                )}
              </button>

              <button
                onClick={handleProcess}
                disabled={tracks.length === 0 || isProcessing}
                className="w-full mb-4 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-400 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-lg font-orbitron font-bold tracking-widest shadow-[0_0_20px_rgba(255,60,172,0.4)] transition-all flex items-center justify-center space-x-2"
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

              {processedBuffer && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex space-x-2">
                    <button
                      onClick={playAudio}
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg font-orbitron flex items-center justify-center space-x-2 transition-colors"
                    >
                      {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                      <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg font-orbitron flex items-center justify-center space-x-2 transition-colors"
                    >
                      <Download size={20} />
                      <span>SAVE WAV</span>
                    </button>
                  </div>

                  <div className="pt-4 border-t border-white/10 space-y-2">
                    <button
                      onClick={handleGenerateTitle}
                      disabled={isGeneratingTitle}
                      className="w-full text-sm text-gray-400 hover:text-white flex items-center justify-center space-x-2 transition-colors"
                    >
                      <Wand2 size={14} />
                      <span>{isGeneratingTitle ? 'Generating...' : 'Generate AI Title'}</span>
                    </button>
                    {generatedTitle && (
                      <p className="text-center text-orange-400 font-orbitron mt-2 text-lg">
                        {generatedTitle}
                      </p>
                    )}
                    
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
    </div>
  );
}

export default App;
