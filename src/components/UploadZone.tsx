import React, { useState, useRef } from 'react';
import { Upload, Link, Mic, Square, Loader2, Music } from 'lucide-react';

interface UploadZoneProps {
  onFileUpload: (files: File[]) => void;
  onYoutubeUrl: (url: string) => void;
  onRecordingComplete?: (blob: Blob) => void;
  isProcessing: boolean;
}

export function UploadZone({ onFileUpload, onYoutubeUrl, onRecordingComplete, isProcessing }: UploadZoneProps) {
  const [activeTab, setActiveTab] = useState<'file' | 'youtube' | 'record'>('file');
  const [url, setUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files) as File[];
      onFileUpload(files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      onFileUpload(files);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url) onYoutubeUrl(url);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (onRecordingComplete) {
          onRecordingComplete(blob);
        }
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex mb-4 space-x-4">
        <button
          onClick={() => setActiveTab('file')}
          className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all ${
            activeTab === 'file' 
              ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(255,107,26,0.5)]' 
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <Upload size={18} />
          <span className="hidden sm:inline">Upload</span>
        </button>
        <button
          onClick={() => setActiveTab('youtube')}
          className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all ${
            activeTab === 'youtube' 
              ? 'bg-pink-500 text-white shadow-[0_0_15px_rgba(255,60,172,0.5)]' 
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <Link size={18} />
          <span className="hidden sm:inline">YouTube</span>
        </button>
        <button
          onClick={() => setActiveTab('record')}
          className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all ${
            activeTab === 'record' 
              ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(255,0,0,0.5)]' 
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <Mic size={18} />
          <span className="hidden sm:inline">Record</span>
        </button>
      </div>

      <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-8 min-h-[200px] flex flex-col items-center justify-center relative overflow-hidden">
        {activeTab === 'file' && (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`w-full h-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 transition-colors ${
              dragActive ? 'border-orange-500 bg-orange-500/10' : 'border-white/20 hover:border-white/40'
            }`}
          >
            <Music size={48} className="text-gray-500 mb-4" />
            <p className="text-gray-300 mb-2 font-rajdhani text-lg">Drag & drop audio files here</p>
            <p className="text-gray-500 text-sm mb-4">MP3, WAV, M4A, FLAC</p>
            <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white py-2 px-6 rounded-full transition-colors">
              Browse Files
              <input type="file" multiple className="hidden" onChange={handleFileChange} accept="audio/*,video/*" />
            </label>
          </div>
        )}

        {activeTab === 'youtube' && (
          <form onSubmit={handleUrlSubmit} className="w-full flex flex-col space-y-4">
            <input
              type="url"
              placeholder="Paste YouTube Link here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-black/50 border border-white/20 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-pink-500 transition-colors font-rajdhani"
            />
            <button
              type="submit"
              disabled={isProcessing || !url}
              className="w-full bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-orbitron tracking-wider shadow-[0_0_15px_rgba(255,60,172,0.4)] transition-all flex items-center justify-center"
            >
              {isProcessing ? <Loader2 className="animate-spin mr-2" /> : null}
              {isProcessing ? 'Extracting...' : 'Extract Audio'}
            </button>
          </form>
        )}

        {activeTab === 'record' && (
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500/20 animate-pulse' : 'bg-white/5'}`}>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  isRecording 
                    ? 'bg-red-600 hover:bg-red-700 shadow-[0_0_20px_rgba(255,0,0,0.6)]' 
                    : 'bg-white/10 hover:bg-white/20 border-2 border-white/20'
                }`}
              >
                {isRecording ? <Square size={24} fill="white" /> : <Mic size={32} />}
              </button>
            </div>
            <p className="font-rajdhani text-gray-300 text-lg">
              {isRecording ? 'Recording... Tap to stop' : 'Tap to record audio'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
