import { useState, useEffect, useRef } from 'react';
import { RemixMode, RemixSettings, AudioTrack } from '../types';

export function useAudioProcessor() {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedBuffer, setProcessedBuffer] = useState<AudioBuffer | null>(null);

  useEffect(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    setAudioContext(ctx);
    return () => {
      ctx.close();
    };
  }, []);

  const decodeAudio = async (file: File | Blob): Promise<AudioBuffer | null> => {
    if (!audioContext) return null;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch (error) {
      console.error('Error decoding audio:', error);
      return null;
    }
  };

  const processAudio = async (
    tracks: AudioTrack[],
    mode: RemixMode,
    settings: RemixSettings
  ) => {
    if (!audioContext || tracks.length === 0) return;

    setIsProcessing(true);

    try {
      // 1. Decode all tracks if not already decoded
      const decodedTracks = await Promise.all(
        tracks.map(async (track) => {
          if (track.buffer) return track;
          const audioBuffer = await decodeAudio(track.file);
          if (!audioBuffer) throw new Error(`Failed to decode track: ${track.name}`);
          return { ...track, buffer: audioBuffer };
        })
      );

      // 2. Determine output duration
      let outputDuration = 0;
      if (mode === 'mashup') {
        // Calculate total duration with crossfades
        outputDuration = decodedTracks.reduce((acc, track) => acc + track.buffer!.duration, 0);
        // Subtract crossfades (simplified)
        if (decodedTracks.length > 1) {
          outputDuration -= (decodedTracks.length - 1) * settings.crossfadeDuration;
        }
      } else {
        // For single track modes, take the longest track (usually just one)
        outputDuration = Math.max(...decodedTracks.map((t) => t.buffer!.duration));
        
        // Add tail for reverb/echo
        if (mode === 'slowed') {
            outputDuration = outputDuration / (settings.slowFactor / 100); // Adjust for speed
            outputDuration += settings.reverbSize; // Add reverb tail
        } else if (mode === 'dj') {
            outputDuration += 2; // Add echo tail
        }
      }

      // 3. Create OfflineAudioContext
      const offlineCtx = new OfflineAudioContext(
        2,
        outputDuration * audioContext.sampleRate,
        audioContext.sampleRate
      );

      // 4. Build the Graph
      const sourceNodes: AudioBufferSourceNode[] = [];

      if (mode === 'dj') {
        const track = decodedTracks[0];
        if (!track || !track.buffer) throw new Error('No track for DJ mode');

        const source = offlineCtx.createBufferSource();
        source.buffer = track.buffer;

        // Sub-bass boost: 60Hz, +6dB
        const subBass = offlineCtx.createBiquadFilter();
        subBass.type = 'peaking';
        subBass.frequency.value = 60;
        subBass.gain.value = 6;
        subBass.Q.value = 1.5;

        // Bass shelf: 180Hz, user gain
        const bassShelf = offlineCtx.createBiquadFilter();
        bassShelf.type = 'lowshelf';
        bassShelf.frequency.value = 180;
        bassShelf.gain.value = settings.bassBoost;

        // Mid scoop: 3kHz, -2dB
        const midScoop = offlineCtx.createBiquadFilter();
        midScoop.type = 'peaking';
        midScoop.frequency.value = 3000;
        midScoop.gain.value = -2;

        // High shelf: 10kHz, +3.5dB
        const highShelf = offlineCtx.createBiquadFilter();
        highShelf.type = 'highshelf';
        highShelf.frequency.value = 10000;
        highShelf.gain.value = 3.5;

        // Echo/Delay
        const delay = offlineCtx.createDelay();
        delay.delayTime.value = settings.echoDelay / 1000;

        const feedback = offlineCtx.createGain();
        feedback.gain.value = settings.echoFeedback / 100;

        const echoFilter = offlineCtx.createBiquadFilter(); // Dampen echo
        echoFilter.type = 'lowpass';
        echoFilter.frequency.value = 2000;

        // Connect Echo Loop
        delay.connect(echoFilter);
        echoFilter.connect(feedback);
        feedback.connect(delay);

        // Limiter
        const limiter = offlineCtx.createDynamicsCompressor();
        limiter.threshold.value = -0.5;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.005;
        limiter.release.value = 0.050;

        const masterGain = offlineCtx.createGain();
        masterGain.gain.value = 0.82;

        // Wiring
        source.connect(subBass);
        subBass.connect(bassShelf);
        bassShelf.connect(midScoop);
        midScoop.connect(highShelf);
        
        // Split to dry and wet (echo)
        highShelf.connect(limiter); // Dry path
        highShelf.connect(delay);   // Wet path
        delay.connect(limiter);     // Wet return

        limiter.connect(masterGain);
        masterGain.connect(offlineCtx.destination);

        source.start(0);
        sourceNodes.push(source);

      } else if (mode === 'slowed') {
        const track = decodedTracks[0];
        if (!track || !track.buffer) throw new Error('No track for Slowed mode');

        const source = offlineCtx.createBufferSource();
        source.buffer = track.buffer;
        source.playbackRate.value = settings.slowFactor / 100;

        // Reverb
        const convolver = offlineCtx.createConvolver();
        // Generate simple impulse response
        const rate = offlineCtx.sampleRate;
        const length = rate * settings.reverbSize;
        const decay = 2.0;
        const impulse = offlineCtx.createBuffer(2, length, rate);
        const impulseL = impulse.getChannelData(0);
        const impulseR = impulse.getChannelData(1);
        for (let i = 0; i < length; i++) {
          const n = length - i;
          impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
          impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        }
        convolver.buffer = impulse;

        const dryGain = offlineCtx.createGain();
        const wetGain = offlineCtx.createGain();
        
        const wetAmount = settings.reverbWet / 100;
        dryGain.gain.value = 1 - wetAmount;
        wetGain.gain.value = wetAmount;

        source.connect(dryGain);
        source.connect(convolver);
        convolver.connect(wetGain);

        dryGain.connect(offlineCtx.destination);
        wetGain.connect(offlineCtx.destination);

        source.start(0);
        sourceNodes.push(source);

      } else if (mode === 'mashup') {
        let startTime = 0;
        const crossfade = settings.crossfadeDuration;

        decodedTracks.forEach((track, index) => {
          if (!track.buffer) return;

          const source = offlineCtx.createBufferSource();
          source.buffer = track.buffer;

          const gainNode = offlineCtx.createGain();
          
          source.connect(gainNode);
          gainNode.connect(offlineCtx.destination);

          source.start(startTime);

          // Crossfading logic
          if (index > 0) {
            // Fade in
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(1, startTime + crossfade);
          }
          
          if (index < decodedTracks.length - 1) {
             // Fade out
             const endTime = startTime + track.buffer.duration;
             gainNode.gain.setValueAtTime(1, endTime - crossfade);
             gainNode.gain.linearRampToValueAtTime(0, endTime);
          }

          startTime += track.buffer.duration - crossfade;
          sourceNodes.push(source);
        });
      }

      // 5. Render
      const renderedBuffer = await offlineCtx.startRendering();
      setProcessedBuffer(renderedBuffer);
      setIsProcessing(false);
      return renderedBuffer;

    } catch (error) {
      console.error('Audio processing failed:', error);
      setIsProcessing(false);
      throw error;
    }
  };

  return {
    audioContext,
    isProcessing,
    processedBuffer,
    processAudio,
    decodeAudio,
  };
}
