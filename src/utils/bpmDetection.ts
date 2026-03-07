/**
 * Detects BPM from an AudioBuffer using an energy-based peak detection algorithm.
 * This is a client-side signal processing approach.
 */
export async function detectBPM(audioBuffer: AudioBuffer): Promise<number | null> {
  try {
    const offlineContext = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // Lowpass filter to isolate bass/beats (kick drum usually drives the tempo)
    const filter = offlineContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 150;
    filter.Q.value = 1;
    
    source.connect(filter);
    filter.connect(offlineContext.destination);
    source.start(0);
    
    const renderedBuffer = await offlineContext.startRendering();
    const data = renderedBuffer.getChannelData(0);
    
    // Analyze a 30-second chunk from the middle of the track for better accuracy
    // (Intros and outros often have irregular beats)
    const duration = renderedBuffer.duration;
    const analyzeDuration = 30;
    const startTime = Math.max(0, duration / 2 - analyzeDuration / 2);
    const endTime = Math.min(duration, startTime + analyzeDuration);
    const startSample = Math.floor(startTime * renderedBuffer.sampleRate);
    const endSample = Math.floor(endTime * renderedBuffer.sampleRate);
    
    // Create a new buffer for the slice to avoid modifying the original
    const slice = new Float32Array(endSample - startSample);
    for (let i = 0; i < slice.length; i++) {
      slice[i] = data[startSample + i];
    }

    // 1. Calculate Energy Peaks
    const peaks = getPeaksAtThreshold(slice, renderedBuffer.sampleRate);
    
    // 2. Count Intervals between peaks
    const intervals = countIntervals(peaks);
    
    // 3. Find the most common interval (tempo)
    const top = intervals.sort((a, b) => b.count - a.count);
    
    if (!top || top.length === 0) return null;

    // Get the top candidate
    let bestCandidate = top[0];
    
    // Convert to BPM
    // BPM = 60 * sampleRate / interval
    let bpm = Math.round((60 * renderedBuffer.sampleRate) / bestCandidate.interval);
    
    // 4. Heuristic: Adjust range to typical music (70-180 BPM)
    // Often detection finds 2x or 0.5x the actual BPM
    while (bpm < 70) bpm *= 2;
    while (bpm > 180) bpm /= 2;
    
    return Math.round(bpm);
  } catch (e) {
    console.error("BPM Detection failed", e);
    return null;
  }
}

function getPeaksAtThreshold(data: Float32Array, sampleRate: number) {
  const peaks: number[] = [];
  const threshold = 0.3; // Minimum amplitude to be considered a peak
  
  // We process in windows to find local maxima
  // Window size of 0.25s is roughly a 16th note at 60BPM, good enough for kicks
  const windowSize = Math.floor(sampleRate / 4); 
  
  for (let i = 0; i < data.length; i += 1000) { // Skip some samples for speed
     let max = 0;
     let maxPos = 0;
     
     // Find local max in this small chunk
     for(let j=0; j < 1000 && (i+j) < data.length; j++) {
        const val = Math.abs(data[i+j]);
        if(val > max) {
            max = val;
            maxPos = i+j;
        }
     }
     
     if(max > threshold) {
         peaks.push(maxPos);
     }
  }
  
  return peaks;
}

function countIntervals(peaks: number[]) {
  const groups: { interval: number, count: number }[] = [];
  
  // Look for consistent intervals between peaks
  peaks.forEach((peak, index) => {
    for (let i = 1; i < 10; i++) { // Look at next 10 peaks
      const nextPeak = peaks[index + i];
      if (!nextPeak) break;

      const interval = nextPeak - peak;
      
      // Check if this interval matches an existing group
      const found = groups.find(group => Math.abs(group.interval - interval) < 100); // Allow small jitter
      
      if (found) {
        found.count++;
        // Average the interval for better accuracy
        found.interval = (found.interval * found.count + interval) / (found.count + 1);
      } else {
        groups.push({
          interval: interval,
          count: 1
        });
      }
    }
  });
  
  return groups;
}
