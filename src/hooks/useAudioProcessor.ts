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
        source.playbackRate.value = settings.slowFactor / 100;
      }

      const masterGain = offlineCtx.createGain();
      masterGain.gain.value = 0.9; 
      masterGain.connect(offlineCtx.destination);

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

        // Connect Filters
        currentChainNode.connect(subBass);
        subBass.connect(bassShelf);
        bassShelf.connect(midScoop);
        midScoop.connect(highShelf);
        
        currentChainNode = highShelf;

        // --- DJ ECHO (Send) ---
        const delay = offlineCtx.createDelay();
        delay.delayTime.value = settings.echoDelay / 1000;

        const feedback = offlineCtx.createGain();
        feedback.gain.value = settings.echoFeedback / 100;

        const echoFilter = offlineCtx.createBiquadFilter();
        echoFilter.type = 'lowpass';
        echoFilter.frequency.value = 2000;

        // Echo Loop
        delay.connect(echoFilter);
        echoFilter.connect(feedback);
        feedback.connect(delay);

        // Connect to Echo (Send)
        currentChainNode.connect(delay);
        
        // Echo return to Master (Parallel)
        delay.connect(masterGain);
      }

      // --- REVERB (Send) ---
      // Applied if Slowed OR Spatial (to give it depth)
      if (isSlowed || isSpatial) {
        const convolver = offlineCtx.createConvolver();
        
        // Reverb Settings
        // If Slowed, use user settings. If Spatial only, use defaults.
        const reverbSize = isSlowed ? settings.reverbSize : 2.5;
        const reverbWet = isSlowed ? settings.reverbWet : 20;

        // Generate Impulse Response
        const rate = offlineCtx.sampleRate;
        const length = rate * reverbSize;
        const decay = 2.0;
        const impulse = offlineCtx.createBuffer(2, length, rate);
        const impulseL = impulse.getChannelData(0);
        const impulseR = impulse.getChannelData(1);
        
        for (let i = 0; i < length; i++) {
          const power = Math.pow(1 - i / length, decay);
          impulseL[i] = (Math.random() * 2 - 1) * power;
          impulseR[i] = (Math.random() * 2 - 1) * power;
        }
        convolver.buffer = impulse;

        const wetGain = offlineCtx.createGain();
        wetGain.gain.value = reverbWet / 100;

        // Connect Reverb (Send)
        currentChainNode.connect(convolver);
        convolver.connect(wetGain);
        wetGain.connect(masterGain);
      }

      // --- SPATIAL PANNER (Insert) ---
      if (isSpatial) {
        const panner = offlineCtx.createStereoPanner();
        
        // Calculate Panning Automation
        const totalTime = outputDuration;
        const speed = settings.panningSpeed || 8; // seconds per cycle
        const frequency = 1 / speed;
        
        const sampleCount = Math.ceil(totalTime * 100);
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
        panner.connect(masterGain);
      } else {
        // No spatial, just connect to master
        currentChainNode.connect(masterGain);
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
