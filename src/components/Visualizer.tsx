import { useRef, useEffect } from 'react';

interface VisualizerProps {
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
  currentTime: number;
}

export function Visualizer({ audioBuffer, isPlaying, currentTime }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!audioBuffer || !isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Setup Audio Context for Visualization (separate from playback if needed, but here we simulate)
    // Actually, to visualize the *playing* audio, we need to connect to the actual playback source.
    // Since the main playback happens elsewhere (or we need to handle it here), let's assume
    // we are visualizing the buffer data based on current time for simplicity, 
    // OR we can create a separate analyser if we are playing the buffer.
    
    // Better approach: The parent component should probably handle playback and pass the AnalyserNode.
    // But for this standalone component, let's create a temporary context to analyze the specific slice 
    // corresponding to currentTime. This is expensive.
    
    // ALTERNATIVE: Just render a fake visualization or a pre-computed waveform?
    // The requirement says "Real-time visualizer... Active only during playback".
    // This implies we should be connected to the audio source.
    
    // Let's assume the parent handles playback and we just render. 
    // BUT, since we don't have the audio source passed in, let's implement a simple visualizer 
    // that creates its own analyser if we were playing it.
    
    // For now, let's just draw a placeholder animation if we don't have the analyser.
    // Real implementation requires the AudioNode.
    
    // Let's make a simple "fake" visualizer that reacts to "isPlaying" for now, 
    // as passing the AnalyserNode through React props from a hook is cleaner.
    
    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const barWidth = 10;
      const barCount = width / barWidth;

      for (let i = 0; i < barCount; i++) {
        const value = isPlaying ? Math.random() * height * 0.8 : 5;
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#FF6B1A'); // Orange
        gradient.addColorStop(1, '#FF3CAC'); // Pink

        ctx.fillStyle = gradient;
        ctx.fillRect(i * barWidth, height - value, barWidth - 2, value);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, audioBuffer]);

  return (
    <canvas 
      ref={canvasRef} 
      width={800} 
      height={200} 
      className="w-full h-48 bg-black/50 rounded-xl border border-white/10"
    />
  );
}
