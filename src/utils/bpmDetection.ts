/**
 * Detects BPM from an AudioBuffer using a simple peak detection and autocorrelation algorithm.
 * This is a client-side signal processing approach.
 */
export async function detectBPM(audioBuffer: AudioBuffer): Promise<number | null> {
  try {
    const offlineContext = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // Lowpass filter to isolate bass/beats
    const filter = offlineContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 150;
    
    source.connect(filter);
    filter.connect(offlineContext.destination);
    source.start(0);
    
    const renderedBuffer = await offlineContext.startRendering();
    const data = renderedBuffer.getChannelData(0);
    
    // We only need to analyze a subset of the data to save CPU
    // Let's take 30 seconds from the middle
    const duration = renderedBuffer.duration;
    const startTime = Math.max(0, duration / 2 - 15);
    const endTime = Math.min(duration, startTime + 30);
    const startSample = Math.floor(startTime * renderedBuffer.sampleRate);
    const endSample = Math.floor(endTime * renderedBuffer.sampleRate);
    const slice = data.slice(startSample, endSample);

    // Find peaks
    const peaks = getPeaks([slice]);
    
    // Count intervals
    const intervals = countIntervals(peaks);
    
    // Find top tempo
    const top = intervals.sort((a, b) => b.count - a.count)[0];
    
    if (!top) return null;
    
    // Convert to BPM (approximate)
    // The interval is in samples. 
    // BPM = 60 * sampleRate / interval
    let bpm = Math.round((60 * renderedBuffer.sampleRate) / top.interval);
    
    // Adjust range to typical music (60-180)
    while (bpm < 60) bpm *= 2;
    while (bpm > 180) bpm /= 2;
    
    return Math.round(bpm);
  } catch (e) {
    console.error("BPM Detection failed", e);
    return null;
  }
}

function getPeaks(data: Float32Array[]) {
  const partSize = 22050;
  const parts = data[0].length / partSize;
  let peaks: { position: number; volume: number }[] = [];

  for (let i = 0; i < parts; i++) {
    let max: { position: number; volume: number } | null = null;
    for (let j = i * partSize; j < (i + 1) * partSize; j++) {
      const volume = Math.abs(data[0][j]);
      if (!max || (volume > max.volume)) {
        max = {
          position: j,
          volume: volume
        };
      }
    }
    if (max) peaks.push(max);
  }

  peaks.sort((a, b) => b.volume - a.volume);
  peaks = peaks.splice(0, peaks.length * 0.5);
  peaks.sort((a, b) => a.position - b.position);

  return peaks;
}

function countIntervals(peaks: any[]) {
  const groups: { interval: number, count: number }[] = [];

  peaks.forEach((peak, index) => {
    for (let i = 1; i < 10; i++) {
      const interval = peaks[index + i];
      if (!interval) break;

      const diff = interval.position - peak.position;
      const found = groups.some(group => {
        if (Math.abs(group.interval - diff) < 5) {
          group.count++;
          return true;
        }
        return false;
      });

      if (!found) {
        groups.push({
          interval: diff,
          count: 1
        });
      }
    }
  });
  return groups;
}
