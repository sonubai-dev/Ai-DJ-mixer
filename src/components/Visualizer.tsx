import { useRef, useEffect, useState } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

export function Visualizer({ analyser, isPlaying }: VisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isPlaying || !analyser || dimensions.width === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set internal resolution to match display size
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Optimize bar calculation to prevent gaps or overlaps
      // We only draw a subset of frequencies for better visual clarity
      const barCount = Math.min(bufferLength, 128);
      const barWidth = width / barCount;
      
      for (let i = 0; i < barCount; i++) {
        const barHeight = (dataArray[i] / 255) * height;

        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#7C3AED'); // Primary (Purple)
        gradient.addColorStop(1, '#22D3EE'); // Accent (Cyan)

        ctx.fillStyle = gradient;
        
        // Use Math.floor/ceil to prevent sub-pixel gaps
        const x = i * barWidth;
        ctx.fillRect(x, height - barHeight, Math.ceil(barWidth) - 1, barHeight);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, analyser, dimensions]);

  return (
    <div ref={containerRef} className="w-full h-48 bg-bg/50 rounded-xl border border-white/10 overflow-hidden">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block"
      />
    </div>
  );
}
