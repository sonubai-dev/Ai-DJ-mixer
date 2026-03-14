import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Download, Volume2, VolumeX } from 'lucide-react';

interface MusicPlayerProps {
  audioContext: AudioContext;
  processedBuffer: AudioBuffer;
  analyserNode: AnalyserNode | null;
  onDownload: () => void;
  onPlayStateChange: (isPlaying: boolean) => void;
  isProcessing?: boolean;
  trackTitle?: string;
}

export function MusicPlayer({ audioContext, processedBuffer, analyserNode, onDownload, onPlayStateChange, isProcessing, trackTitle }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const animationRef = useRef<number>(0);

  // Initialize GainNode
  useEffect(() => {
    if (!audioContext) return;
    const gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNodeRef.current = gainNode;
    
    return () => {
      gainNode.disconnect();
    };
  }, [audioContext]);

  // Update volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Stop playback when buffer changes or processing starts
  useEffect(() => {
    stopPlayback();
    setCurrentTime(0);
    pauseTimeRef.current = 0;
    setIsPlaying(false);
  }, [processedBuffer, isProcessing]);

  const updateProgress = () => {
    if (isPlaying) {
      const elapsed = audioContext.currentTime - startTimeRef.current;
      setCurrentTime(elapsed % processedBuffer.duration);
      animationRef.current = requestAnimationFrame(updateProgress);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateProgress);
    } else {
      cancelAnimationFrame(animationRef.current);
    }
    onPlayStateChange(isPlaying);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying, onPlayStateChange]);

  const playAudio = (startOffset = pauseTimeRef.current) => {
    if (!processedBuffer || !audioContext || !gainNodeRef.current) return;

    stopPlayback(); // Ensure any existing source is stopped

    const source = audioContext.createBufferSource();
    source.buffer = processedBuffer;
    
    if (analyserNode) {
      source.connect(analyserNode);
      analyserNode.disconnect(); // Disconnect from previous destination if any
      analyserNode.connect(gainNodeRef.current);
    } else {
      source.connect(gainNodeRef.current);
    }
    
    const offset = startOffset % processedBuffer.duration;
    source.start(0, offset);
    startTimeRef.current = audioContext.currentTime - offset;
    pauseTimeRef.current = offset;
    
    sourceNodeRef.current = source;
    setIsPlaying(true);
    
    source.onended = () => {
      if (sourceNodeRef.current === source) {
        setIsPlaying(false);
        pauseTimeRef.current = 0;
        setCurrentTime(0);
      }
    };
  };

  const stopPlayback = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.onended = null;
        sourceNodeRef.current.stop();
      } catch (e) { /* ignore */ }
      sourceNodeRef.current = null;
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      stopPlayback();
      pauseTimeRef.current = audioContext.currentTime - startTimeRef.current;
      setIsPlaying(false);
    } else {
      playAudio();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    pauseTimeRef.current = time;
    if (isPlaying) {
      playAudio(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (vol > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-secondary border border-white/10 rounded-xl p-5 space-y-5 shadow-lg shadow-black/50">
      {/* Track Display */}
      <div className="text-center space-y-1">
        <h4 className="text-primary font-display font-bold truncate px-2" title={trackTitle || 'Custom Mix'}>
          {trackTitle || 'Custom Mix'}
        </h4>
        <p className="text-xs text-gray-500 font-sans uppercase tracking-widest">
          {isPlaying ? 'Now Playing' : 'Ready to Play'}
        </p>
      </div>

      {/* Seek Bar */}
      <div className="space-y-2">
        <input
          type="range"
          min="0"
          max={processedBuffer.duration}
          step="0.01"
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-bg rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary/80 transition-all"
        />
        <div className="flex justify-between text-xs text-gray-400 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(processedBuffer.duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Volume Control */}
        <div className="flex items-center space-x-3 w-1/3">
          <button onClick={toggleMute} className="text-gray-400 hover:text-white transition-colors">
            {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 h-1.5 bg-bg rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary/80"
          />
        </div>

        {/* Play/Pause */}
        <div className="flex justify-center w-1/3">
          <button
            onClick={togglePlayPause}
            className="w-14 h-14 bg-gradient-to-br from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all transform hover:scale-105 active:scale-95"
          >
            {isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current ml-1" />}
          </button>
        </div>

        {/* Download */}
        <div className="flex justify-end w-1/3">
          <button
            onClick={onDownload}
            className="flex items-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white rounded-lg transition-all text-sm font-sans font-bold tracking-wider"
          >
            <Download size={16} />
            <span className="hidden sm:inline">SAVE WAV</span>
          </button>
        </div>
      </div>
    </div>
  );
}
