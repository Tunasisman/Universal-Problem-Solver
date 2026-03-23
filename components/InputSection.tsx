
import React, { useRef, useState, useEffect } from 'react';
import { Mic, Image as ImageIcon, X, MicOff, Upload, FileText, Plus, Trash2 } from 'lucide-react';
import { LoadingState } from '../types';

interface InputSectionProps {
  text: string;
  setText: (text: string) => void;
  images: File[];
  setImages: (files: File[]) => void;
  audio: Blob | null;
  setAudio: (blob: Blob | null) => void;
  loadingState: LoadingState;
  onSolve: () => void;
}

const InputSection: React.FC<InputSectionProps> = ({
  text,
  setText,
  images,
  setImages,
  audio,
  setAudio,
  loadingState,
  onSolve
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Clean up URL objects for image previews to avoid memory leaks
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    // Revoke old URLs
    imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));

    const newUrls = images.map(file => URL.createObjectURL(file));
    setImagePreviewUrls(newUrls);

    // Cleanup on unmount or when images change
    return () => {
      newUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [images]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Append new files to existing ones
      const newFiles = Array.from(e.target.files);
      setImages([...images, ...newFiles]);
    }
    // Reset input so the same file can be selected again if needed
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        setAudio(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isProcessing = loadingState === LoadingState.PROCESSING || loadingState === LoadingState.ANALYZING;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      
      {/* Text Input */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl opacity-20 group-hover:opacity-40 transition duration-500 blur-sm"></div>
        <div className="relative glass-panel rounded-3xl p-1">
          <textarea
            className="w-full h-36 bg-slate-900/50 rounded-2xl border-none text-slate-200 placeholder-slate-500 resize-none p-6 focus:ring-0 text-lg leading-relaxed transition-colors"
            placeholder="Describe the problem you need to solve..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isProcessing}
          />
          <div className="absolute bottom-4 right-4 text-slate-600 pointer-events-none">
            <FileText className="w-5 h-5 opacity-50" />
          </div>
        </div>
      </div>

      {/* Attachments Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Multi-Image Card */}
        <div 
          className={`relative group overflow-hidden rounded-3xl transition-all duration-300 ${images.length > 0 ? 'ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/10' : 'hover:shadow-lg hover:shadow-indigo-500/10'}`}
          style={{ minHeight: '220px' }}
        >
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-3xl"></div>
          
          <input
            type="file"
            accept="image/*"
            multiple // Enable multi-file selection
            ref={fileInputRef}
            className="hidden"
            onChange={handleImageUpload}
            disabled={isProcessing}
          />
          
          {images.length > 0 ? (
            <div className="relative z-10 h-full flex flex-col p-4">
              <div className="flex-1 flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
                {images.map((img, idx) => (
                  <div key={idx} className="relative flex-shrink-0 w-32 h-32 md:w-40 md:h-40 group/img rounded-2xl overflow-hidden border border-white/10 shadow-md">
                    <img 
                      src={imagePreviewUrls[idx]} 
                      alt={`Upload ${idx + 1}`} 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                        className="bg-red-500/80 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Add More Button */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 w-32 h-32 md:w-40 md:h-40 rounded-2xl border-2 border-dashed border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10 flex flex-col items-center justify-center space-y-2 transition-all group/add"
                >
                  <Plus className="w-8 h-8 text-slate-500 group-hover/add:text-purple-400" />
                  <span className="text-xs text-slate-500 group-hover/add:text-purple-300">Add Image</span>
                </button>
              </div>
              
              <div className="mt-3 flex items-center justify-between px-2">
                <div>
                   <p className="text-white font-medium text-sm drop-shadow-md">{images.length} image{images.length !== 1 ? 's' : ''} attached</p>
                   <p className="text-xs text-slate-400 mt-0.5">Multiple angles help analysis</p>
                </div>
                <button 
                   onClick={() => setImages([])}
                   className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
          ) : (
            <div className="relative z-10 h-full flex flex-col items-center justify-center p-8 space-y-4 text-slate-400 group-hover:text-purple-300 transition-colors">
              <button 
                  className="w-full h-full flex flex-col items-center justify-center"
                  onClick={() => fileInputRef.current?.click()}
              >
                  <div className="p-4 bg-slate-800/50 rounded-2xl border border-white/5 group-hover:bg-purple-500/10 group-hover:border-purple-500/20 transition-all duration-300 shadow-inner">
                    <ImageIcon size={32} />
                  </div>
                  <div className="text-center mt-4">
                    <span className="block text-lg font-medium text-slate-300 group-hover:text-purple-200">Upload Images</span>
                    <span className="text-sm text-slate-500">Supports JPG, PNG, WEBP</span>
                  </div>
                  <p className="mt-4 text-xs text-slate-500 max-w-[200px] text-center leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    You can upload multiple angles or screenshots to help the AI understand the problem more accurately.
                  </p>
              </button>
            </div>
          )}
        </div>

        {/* Audio Card */}
        <div 
          className={`relative group overflow-hidden rounded-3xl transition-all duration-300 ${audio ? 'ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/10' : isRecording ? 'ring-2 ring-red-500/50' : 'hover:shadow-lg hover:shadow-indigo-500/10'}`}
          style={{ minHeight: '220px' }}
        >
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-3xl"></div>
          
          {audio ? (
            <div className="relative z-10 h-full flex flex-col items-center justify-center p-6 space-y-4">
               <button 
                onClick={() => setAudio(null)}
                className="absolute top-4 right-4 bg-slate-900/80 hover:bg-red-500/80 text-white p-2 rounded-full transition-colors border border-white/10 backdrop-blur-sm"
              >
                <X size={18} />
              </button>
              <div className="p-4 bg-indigo-500/20 text-indigo-400 rounded-full border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                <Mic size={32} />
              </div>
              <div className="text-center w-full">
                <span className="block text-indigo-200 font-medium mb-2">Voice Message Ready</span>
                <audio controls src={URL.createObjectURL(audio)} className="h-8 w-full max-w-[240px] opacity-80 hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ) : isRecording ? (
             <div className="relative z-10 h-full flex flex-col items-center justify-center space-y-6 p-6">
                <div className="relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-20"></span>
                  <div className="p-5 bg-gradient-to-br from-red-500 to-rose-600 rounded-full relative z-10 text-white shadow-xl shadow-red-500/30">
                    <Mic size={40} />
                  </div>
                </div>
                <div className="flex flex-col items-center space-y-3">
                   <span className="text-white font-mono text-2xl tracking-wider font-light">{formatTime(recordingDuration)}</span>
                   <button 
                      onClick={stopRecording}
                      className="px-6 py-2 bg-slate-800 hover:bg-red-500/20 text-red-200 text-sm font-medium rounded-full border border-red-500/30 transition-colors"
                   >
                     Stop Recording
                   </button>
                </div>
             </div>
          ) : (
            <button 
              className="relative z-10 flex flex-col items-center justify-center w-full h-full p-8 space-y-4 text-slate-400 group-hover:text-indigo-300 transition-colors"
              onClick={startRecording}
              disabled={isProcessing}
            >
               <div className="p-4 bg-slate-800/50 rounded-2xl border border-white/5 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-all duration-300 shadow-inner">
                {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
              </div>
              <div className="text-center">
                <span className="block text-lg font-medium text-slate-300 group-hover:text-indigo-200">Record Audio</span>
                <span className="text-sm text-slate-500">Describe the problem verbally</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="sticky bottom-6 z-40 pt-4">
        <button
          onClick={onSolve}
          disabled={(!text && images.length === 0 && !audio) || isProcessing || isRecording}
          className={`w-full py-5 rounded-2xl font-bold text-lg shadow-xl shadow-black/20 transition-all duration-300 transform active:scale-[0.98] border border-white/10
            ${isProcessing 
              ? 'bg-slate-800 text-slate-400 cursor-not-allowed' 
              : (!text && images.length === 0 && !audio)
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-purple-900/20 hover:shadow-purple-700/30'
            }
          `}
        >
          {isProcessing ? (
             <span className="flex items-center justify-center space-x-3">
               <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
               <span>Analyzing...</span>
             </span>
          ) : (
            "Analyze & Solve"
          )}
        </button>
      </div>
    </div>
  );
};

export default InputSection;
