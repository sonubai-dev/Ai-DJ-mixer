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
      <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-8 min-h-[200px] flex flex-col items-center justify-center relative overflow-hidden">
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
      </div>
    </div>
  );
}
