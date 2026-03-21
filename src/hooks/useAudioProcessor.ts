import { useState, useEffect, useRef } from 'react';
import { RemixMode, RemixSettings, AudioTrack } from '../types';

export function useAudioProcessor() {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedBuffer, setProcessedBuffer] = useState<AudioBuffer | null>(null);
  const irCache = useRef<AudioBuffer | null>(null);
  const generatedIRCache = useRef<Map<number, AudioBuffer>>(new Map());

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
      const track = decodedTracks[0];
      if (!track || !track.buffer) throw new Error('No track to process');

      const isDJ = mode.includes('dj') || mode === 'dj';
      const isSlowed = mode.includes('slowed') || mode === 'slowed';
      const isSpatial = mode.includes('3d') || mode.includes('8d') || mode.includes('16d');

      // Base duration
      outputDuration = track.buffer.duration;

      // Adjust for speed
      if (isSlowed) {
        outputDuration = outputDuration / (settings.slowFactor / 100);
      }

      // Add tails
      if (isSlowed || isSpatial) {
        outputDuration += settings.reverbSize + 2; // Reverb tail
      }
      if (isDJ) {
        outputDuration += 2; // Echo tail
      }

      // 3. Create OfflineAudioContext
      const offlineCtx = new OfflineAudioContext(
        2,
        outputDuration * audioContext.sampleRate,
        audioContext.sampleRate
      );

      // 4. Build the Graph
      const source = offlineCtx.createBufferSource();
      source.buffer = track.buffer;

      if (isSlowed) {
        // Natural pitch drop with speed reduction (8-15% slower)
        const slowFactor = Math.max(0.85, Math.min(0.92, settings.slowFactor / 100));
        source.playbackRate.value = slowFactor;
      }

      // --- MASTERING CHAIN (Professional Polish & Efficiency) ---
      const useAIMastering = settings.aiMastering !== false; // Default to true if undefined
      const highEndBoostVal = settings.masteringHighEndBoost ?? 1.5;
      const lowEndTightenVal = settings.masteringLowEndTighten ?? -2.5;
      const vocalPresenceVal = settings.masteringVocalPresence ?? 2.0;
      const limiterThresholdVal = settings.masteringLimiterThreshold ?? -0.8;

      // 1. Subsonic Rumble Filter (Saves headroom, improves clarity)
      const subsonicFilter = offlineCtx.createBiquadFilter();
      subsonicFilter.type = 'highpass';
      subsonicFilter.frequency.value = 30; // Cut below 30Hz
      subsonicFilter.Q.value = 0.7;

      // 2. High-End "Air" Boost (Sharper, clearer highs)
      const highEndBoost = offlineCtx.createBiquadFilter();
      highEndBoost.type = 'highshelf'; // Changed to highshelf for more air
      highEndBoost.frequency.value = 12000; // 12k range
      highEndBoost.gain.value = useAIMastering ? highEndBoostVal : 0;

      // 3. Mud Removal
      const lowEndTighten = offlineCtx.createBiquadFilter();
      lowEndTighten.type = 'peaking';
      lowEndTighten.frequency.value = 250; // 250Hz range
      lowEndTighten.gain.value = useAIMastering ? lowEndTightenVal : 0;
      lowEndTighten.Q.value = 1.2;

      // 4. Vocal/Lead Presence
      const vocalPresence = offlineCtx.createBiquadFilter();
      vocalPresence.type = 'peaking';
      vocalPresence.frequency.value = 4500; // 4.5k range for sharper presence
      vocalPresence.gain.value = useAIMastering ? vocalPresenceVal : 0;
      vocalPresence.Q.value = 1.0;

      // 5. Fast, Transparent Limiter
      const limiter = offlineCtx.createDynamicsCompressor();
      limiter.threshold.value = useAIMastering ? limiterThresholdVal : -0.1;
      limiter.knee.value = 0;
      limiter.ratio.value = useAIMastering ? 20 : 1;
      limiter.attack.value = 0.001; // Faster attack for sharper transients
      limiter.release.value = 0.05; // Faster release for more perceived loudness

      const masterGain = offlineCtx.createGain();
      masterGain.gain.value = 1.0; 

      // Connect Mastering Chain (Only connect active nodes for power efficiency)
      if (useAIMastering) {
        subsonicFilter.connect(lowEndTighten);
        lowEndTighten.connect(vocalPresence);
        vocalPresence.connect(highEndBoost);
        highEndBoost.connect(limiter);
        limiter.connect(masterGain);
      } else {
        subsonicFilter.connect(masterGain); // Still use subsonic for basic clarity
      }
      masterGain.connect(offlineCtx.destination);

      // The entry point to the mastering chain
      const masteringEntry = subsonicFilter;

      // Track the end of the signal chain
      let currentChainNode: AudioNode = source;

      // --- DJ EFFECTS CHAIN (Insert) ---
      if (isDJ) {
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

        // --- Granular Tone Shaping ---
        const bassEQ = offlineCtx.createBiquadFilter();
        bassEQ.type = 'lowshelf';
        bassEQ.frequency.value = 100;
        bassEQ.gain.value = settings.bass || 0;

        const trebleEQ = offlineCtx.createBiquadFilter();
        trebleEQ.type = 'highshelf';
        trebleEQ.frequency.value = 8000;
        trebleEQ.gain.value = settings.treble || 0;

        // Connect Filters
        currentChainNode.connect(subBass);
        subBass.connect(bassShelf);
        bassShelf.connect(midScoop);
        midScoop.connect(highShelf);
        highShelf.connect(bassEQ);
        bassEQ.connect(trebleEQ);
        
        currentChainNode = trebleEQ;

        // --- DJ ECHO (Send) ---
        const delay = offlineCtx.createDelay();
        delay.delayTime.value = 0; // Fixed at 0 as requested

        const feedback = offlineCtx.createGain();
        feedback.gain.value = 0; // Fixed at 0 as requested

        const echoFilter = offlineCtx.createBiquadFilter();
        echoFilter.type = 'lowpass';
        echoFilter.frequency.value = 2000;

        // Echo Loop
        delay.connect(echoFilter);
        echoFilter.connect(feedback);
        feedback.connect(delay);

        // Connect to Echo (Send)
        currentChainNode.connect(delay);
        
        // Echo return to Mastering Chain (Parallel)
        delay.connect(masteringEntry);
      }

      // --- REVERB (Send) ---
      if (isSlowed || isSpatial) {
        const convolver = offlineCtx.createConvolver();
        
        const reverbSize = settings.reverbSize;
        const reverbWet = settings.reverbWet;

        let impulse: AudioBuffer;
        
        // Use cached generated IR for massive power efficiency boost
        if (generatedIRCache.current.has(reverbSize)) {
          impulse = generatedIRCache.current.get(reverbSize)!;
        } else {
          // Try to use a pre-recorded high-quality plate impulse response for a natural sound
          try {
            if (!irCache.current) {
              const irUrl = 'https://raw.githubusercontent.com/mdn/webaudio-examples/master/voice-change-o-matic/audio/plate.wav';
              const irRes = await fetch(irUrl);
              const irAB = await irRes.arrayBuffer();
              irCache.current = await audioContext.decodeAudioData(irAB);
            }
            
            const baseIR = irCache.current!;
            const rate = offlineCtx.sampleRate;
            
            const length = Math.min(baseIR.length, Math.floor(reverbSize * rate));
            impulse = offlineCtx.createBuffer(2, length, rate);
            
            for (let channel = 0; channel < 2; channel++) {
              const channelData = baseIR.getChannelData(channel % baseIR.numberOfChannels);
              const targetData = impulse.getChannelData(channel);
              for (let i = 0; i < length; i++) {
                const t = i / rate;
                const decayEnvelope = Math.exp(-6.908 * t / reverbSize);
                targetData[i] = channelData[i] * decayEnvelope;
              }
            }
          } catch (e) {
            const rate = offlineCtx.sampleRate;
            const length = Math.floor(reverbSize * rate);
            impulse = offlineCtx.createBuffer(2, length, rate);
            for (let channel = 0; channel < 2; channel++) {
              const data = impulse.getChannelData(channel);
              for (let i = 0; i < length; i++) {
                const t = i / rate;
                const power = Math.exp(-6.908 * t / reverbSize);
                data[i] = (Math.random() * 2 - 1) * power;
              }
            }
          }
          // Cache it
          generatedIRCache.current.set(reverbSize, impulse);
        }
        
        convolver.buffer = impulse;

        // Reverb Path Filtering for a "Richer Atmosphere"
        const reverbHP = offlineCtx.createBiquadFilter();
        reverbHP.type = 'highpass';
        reverbHP.frequency.value = 300; // Remove muddiness
        
        const reverbLP = offlineCtx.createBiquadFilter();
        reverbLP.type = 'lowpass';
        reverbLP.frequency.value = 5000; // Warm, smooth top end

        const wetGain = offlineCtx.createGain();
        wetGain.gain.value = reverbWet / 100;

        // Connect Reverb Chain
        currentChainNode.connect(reverbHP);
        reverbHP.connect(reverbLP);
        reverbLP.connect(convolver);
        convolver.connect(wetGain);
        wetGain.connect(masteringEntry);
      }

      // Final connection to mastering chain if not already connected via effects
      if (!isSpatial) {
        currentChainNode.connect(masteringEntry);
      }

      // --- SPATIAL PANNER (Insert) ---
      if (isSpatial) {
        const panner = offlineCtx.createStereoPanner();
        
        // Calculate Panning Automation
        const totalTime = outputDuration;
        const speed = settings.panningSpeed || 8; // seconds per cycle
        const frequency = 1 / speed;
        
        // Optimize panning calculation (less samples needed for smooth panning)
        const sampleRate = 20; // 20 updates per second is plenty smooth for panning
        const sampleCount = Math.ceil(totalTime * sampleRate);
        const panValues = new Float32Array(sampleCount);
        
        for (let i = 0; i < sampleCount; i++) {
          const t = (i / sampleCount) * totalTime;
          // Sine wave from -1 to 1
          let val = Math.sin(2 * Math.PI * frequency * t);
          
          // For "3D", maybe we don't go full hard left/right?
          if (mode.includes('3d')) {
             val *= 0.6; // Narrower for 3D
          }
          panValues[i] = val;
        }
        
        panner.pan.setValueCurveAtTime(panValues, 0, totalTime);
        
        currentChainNode.connect(panner);
        panner.connect(masteringEntry); // Connect to mastering chain
      }

      source.start(0);

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
