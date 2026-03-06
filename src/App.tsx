import { useState, useRef } from 'react';
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
import { generateDJTitle, transcribeAudio, guessBPMFromMetadata, getTrendBasedRemixSettings } from './services/aiService';
import { Play, Pause, Download, Wand2, Loader2, FileText, Save, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

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
    crossfadeDuration: 2,
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzingTrends, setIsAnalyzingTrends] = useState(false);
  const [detectingBPMId, setDetectingBPMId] = useState<string | null>(null);
  
  const { processAudio, isProcessing, processedBuffer, audioContext, decodeAudio } = useAudioProcessor();
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);

  const handleFileUpload = async (files: File[]) => {
    const newTracks = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      duration: 0, 
    }));
    setTracks((prev) => [...prev, ...newTracks]);
    
    // Auto-decode duration if possible (optional, skipping for now to keep it fast)
  };

  const handleYoutubeUrl = async (url: string) => {
    // In a real app, we would fetch the stream here or send to backend
    // For now, let's assume the backend returns a blob/stream we can turn into a File object
    try {
      const response = await fetch('/api/extract-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      
      if (!response.ok) throw new Error('Failed to extract');
      
      const blob = await response.blob();
      const filename = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'youtube_audio.mp3';
      const file = new File([blob], filename, { type: 'audio/mpeg' });
      
      handleFileUpload([file]);
    } catch (error) {
      console.error(error);
      alert('Failed to extract YouTube audio');
    }
  };

  const handleRecordingComplete = async (blob: Blob) => {
    // 1. Add to tracks
    const file = new File([blob], `Recording_${new Date().toLocaleTimeString()}.webm`, { type: 'audio/webm' });
    handleFileUpload([file]);

    // 2. Transcribe
    setIsTranscribing(true);
    const text = await transcribeAudio(blob);
    setTranscription(text);
    setIsTranscribing(false);
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
      source.connect(audioContext.destination);
      
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

  return (
    <div className="min-h-screen bg-[#050314] text-white font-rajdhani selection:bg-pink-500 selection:text-white pb-20">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,107,26,0.5)]">
              <span className="font-orbitron font-bold text-xl">DJ</span>
            </div>
            <h1 className="text-2xl font-orbitron tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              INDIAN REMIX STUDIO
            </h1>
          </div>
          <div className="flex items-center space-x-4">
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
              onYoutubeUrl={handleYoutubeUrl}
              onRecordingComplete={handleRecordingComplete}
              isProcessing={isProcessing}
            />
            
            {/* Transcription Result */}
            {(isTranscribing || transcription) && (
              <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-6 animate-in fade-in">
                <h3 className="text-white font-orbitron text-lg mb-2 flex items-center gap-2">
                  <FileText size={20} className="text-pink-500" />
                  AI Transcription
                </h3>
                {isTranscribing ? (
                  <div className="flex items-center space-x-2 text-gray-400">
                    <Loader2 className="animate-spin" size={16} />
                    <span>Transcribing audio...</span>
                  </div>
                ) : (
                  <p className="text-gray-300 italic bg-white/5 p-4 rounded-lg border border-white/5">
                    "{transcription}"
                  </p>
                )}
              </div>
            )}

            <TrackList 
              tracks={tracks} 
              onRemoveTrack={handleRemoveTrack} 
              onUpdateLanguage={handleUpdateLanguage}
              onDetectBPM={handleDetectBPM}
              detectingBPMId={detectingBPMId}
            />
          </div>

          {/* Right Column: Settings & Actions */}
          <div className="space-y-8">
            <SettingsPanel 
              mode={activeMode} 
              settings={settings} 
              onSettingsChange={setSettings} 
            />

            {/* Action Card */}
            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-6">
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
             audioBuffer={processedBuffer} 
             isPlaying={isPlaying} 
             currentTime={0} // Placeholder
           />
        </div>

        {/* Saved Presets */}
        <PresetList onLoadPreset={handleLoadPreset} />

      </main>
    </div>
  );
}

export default App;
