import React, { useState } from 'react';
import { Music, Upload } from 'lucide-react';

interface UploadZoneProps {
  onFileUpload: (files: File[]) => void;
}

export function UploadZone({ onFileUpload }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);

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

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 min-h-[240px] flex flex-col items-center justify-center relative overflow-hidden shadow-2xl shadow-white/5 group">
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`w-full h-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 transition-all duration-300 relative z-10 ${
            dragActive 
              ? 'border-orange-500 bg-orange-500/10 scale-[1.02] shadow-[0_0_30px_rgba(249,115,22,0.3)]' 
              : 'border-white/20 hover:border-orange-400/50 hover:bg-white/5'
          }`}
        >
          <div className={`p-4 rounded-full mb-4 transition-all duration-300 ${dragActive ? 'bg-orange-500 text-white' : 'bg-white/5 text-gray-400 group-hover:text-orange-400 group-hover:bg-white/10'}`}>
            <Upload size={32} />
          </div>
          <h3 className="text-white text-xl font-orbitron font-bold mb-2 tracking-wide drop-shadow-md">Drop Audio Files Here</h3>
          <p className="text-gray-400 text-sm mb-6 font-rajdhani font-semibold tracking-wide">Supports MP3, WAV, M4A, FLAC</p>
          
          <label className="cursor-pointer relative group/btn">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-red-600 rounded-full blur opacity-60 group-hover/btn:opacity-100 transition duration-200"></div>
            <span className="relative flex items-center gap-2 bg-black hover:bg-gray-900 text-white py-2.5 px-8 rounded-full transition-colors font-bold tracking-wide border border-white/10">
              <Music size={16} />
              <span>Browse Files</span>
            </span>
            <input type="file" multiple className="hidden" onChange={handleFileChange} accept="audio/*,video/*" />
          </label>
        </div>
      </div>
    </div>
  );
}
