import { motion } from 'motion/react';
import { Upload, Play, Sliders } from 'lucide-react';

interface HeroProps {
  onUploadClick: () => void;
  onDemoClick: () => void;
  onEffectsClick: () => void;
}

export function Hero({ onUploadClick, onDemoClick, onEffectsClick }: HeroProps) {
  return (
    <div className="relative overflow-hidden py-20 lg:py-32">
      {/* Animated Waveform Background */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-20">
        <div className="w-full h-full flex items-center justify-center gap-2">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="w-2 bg-primary rounded-full"
              animate={{
                height: ['20%', '80%', '40%', '100%', '30%'],
              }}
              transition={{
                duration: 1.5 + Math.random(),
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
                delay: i * 0.1,
              }}
            />
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10 text-center">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-7xl font-display font-bold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent"
        >
          AI DJ Mixer &<br />Audio Converter
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10"
        >
          Convert any MP3 into DJ mixes, Slowed + Reverb, 8D audio and more using AI.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button 
            onClick={onUploadClick}
            className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)]"
          >
            <Upload size={20} />
            Upload Audio
          </button>
          <button 
            onClick={onDemoClick}
            className="w-full sm:w-auto px-8 py-4 bg-secondary hover:bg-secondary/80 text-white border border-white/10 rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
          >
            <Play size={20} />
            Try Demo
          </button>
          <button 
            onClick={onEffectsClick}
            className="w-full sm:w-auto px-8 py-4 bg-transparent hover:bg-white/5 text-white border border-white/10 rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
          >
            <Sliders size={20} />
            View Effects
          </button>
        </motion.div>
      </div>
    </div>
  );
}
