
import React, { useState, useRef, useEffect } from 'react';
import { SolverResponse, QAItem } from '../types';
import { AlertTriangle, CheckCircle, Search, FileText, MessageCircle, Send, Sparkles, ScanEye, Activity, CircleHelp, Wrench, ClipboardList, AlertOctagon, Image as ImageIcon, Mic, X, MicOff, Plus } from 'lucide-react';

interface ResultSectionProps {
  response: SolverResponse | null;
  qaItems: QAItem[];
  onAskQuestion: (question: string, images: File[], audio: Blob | null) => Promise<void>;
  isAsking: boolean;
  hasImage: boolean;
}

// Helper to render text with bold formatting
const renderFormattedText = (text: string, highlightColor: string = "text-white") => {
  if (!text) return null;
  
  const parts = text.split(/(\*\*.*?\*\*)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className={`font-semibold ${highlightColor}`}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

const renderSectionContent = (text: string, highlightColor: string, bulletBgColor: string) => {
  if (!text) return null;

  const hasBullets = /(?:^|\s)(?:[*•-])\s/.test(text);

  if (!hasBullets) {
    return (
      <div className="p-6 md:p-8 text-slate-300 text-lg leading-relaxed">
        {renderFormattedText(text, highlightColor)}
      </div>
    );
  }

  const parts = text.split(/(?:^|\s+)(?:[*•-])\s+/);

  return (
    <div className="p-6 md:p-8">
      <div className="space-y-4">
        {parts.map((part, index) => {
          if (!part.trim()) return null;

          const isIntro = index === 0 && !text.trim().match(/^(?:[*•-])\s/);

          if (isIntro) {
            return (
              <p key={index} className="text-slate-300 text-lg leading-relaxed mb-6">
                {renderFormattedText(part, highlightColor)}
              </p>
            );
          }

          return (
            <div key={index} className="flex items-start space-x-4">
              <span className={`mt-2.5 w-2 h-2 rounded-full flex-shrink-0 ${bulletBgColor} shadow-sm`}></span>
              <span className="text-slate-300 text-lg leading-relaxed">
                {renderFormattedText(part, highlightColor)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ResultSection: React.FC<ResultSectionProps> = ({ response, qaItems, onAskQuestion, isAsking, hasImage }) => {
  const [question, setQuestion] = useState('');
  
  // Follow-up Media States
  const [followUpImages, setFollowUpImages] = useState<File[]>([]);
  const [followUpAudio, setFollowUpAudio] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qaEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (qaEndRef.current) {
      qaEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [qaItems]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFollowUpImages(prev => [...prev, ...Array.from(e.target.files!)]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setFollowUpImages(prev => prev.filter((_, i) => i !== index));
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
        setFollowUpAudio(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone error:", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!question.trim() && followUpImages.length === 0 && !followUpAudio) || isAsking) return;
    
    await onAskQuestion(question, followUpImages, followUpAudio);
    
    // Reset states
    setQuestion('');
    setFollowUpImages([]);
    setFollowUpAudio(null);
  };

  if (!response) return null;

  const { identification, rootCause, solution, notes, highlightedArea, confidence, followUpQuestions, quickActions } = response.sections;

  // Determine colors based on confidence score
  const getConfidenceColors = (score: number) => {
    if (score >= 75) return { 
      bg: "bg-emerald-500", 
      text: "text-emerald-400", 
      border: "border-l-emerald-500", 
      headerBg: "bg-emerald-900/20", 
      headerIconBg: "bg-emerald-500/20",
      headerText: "text-emerald-100"
    };
    if (score >= 40) return { 
      bg: "bg-amber-500", 
      text: "text-amber-400", 
      border: "border-l-amber-500", 
      headerBg: "bg-amber-900/20", 
      headerIconBg: "bg-amber-500/20",
      headerText: "text-amber-100"
    };
    return { 
      bg: "bg-rose-500", 
      text: "text-rose-400", 
      border: "border-l-rose-500", 
      headerBg: "bg-rose-900/20", 
      headerIconBg: "bg-rose-500/20",
      headerText: "text-rose-100"
    };
  };

  const confColors = confidence ? getConfidenceColors(confidence.score) : null;

  // Determine severity colors
  const getSeverityColors = (level: string) => {
    const l = level.toLowerCase();
    if (l === 'critical') return { bg: 'bg-rose-500', text: 'text-rose-400', border: 'border-rose-500', bgSoft: 'bg-rose-900/20' };
    if (l === 'high') return { bg: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500', bgSoft: 'bg-orange-900/20' };
    if (l === 'moderate' || l === 'medium') return { bg: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500', bgSoft: 'bg-yellow-900/20' };
    return { bg: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500', bgSoft: 'bg-emerald-900/20' };
  };
  
  const severityColors = quickActions ? getSeverityColors(quickActions.severity.level) : getSeverityColors('low');

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-32">
      
      {/* 1. Identification (Blue) */}
      <div className="glass-card rounded-3xl overflow-hidden shadow-xl shadow-black/20 border-l-4 border-l-blue-500">
        <div className="bg-blue-900/20 p-5 border-b border-blue-500/10 flex items-center space-x-4">
          <div className="bg-blue-500/20 p-2.5 rounded-xl text-blue-400">
            <Search className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-blue-100 tracking-wide">Problem Identification</h2>
        </div>
        {renderSectionContent(identification, "text-blue-200", "bg-blue-400")}
      </div>

      {/* 2. Root Cause (Yellow/Amber) */}
      <div className="glass-card rounded-3xl overflow-hidden shadow-xl shadow-black/20 border-l-4 border-l-amber-500">
        <div className="bg-amber-900/20 p-5 border-b border-amber-500/10 flex items-center space-x-4">
          <div className="bg-amber-500/20 p-2.5 rounded-xl text-amber-400">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-amber-100 tracking-wide">Root Cause Analysis</h2>
        </div>
        {renderSectionContent(rootCause, "text-amber-200", "bg-amber-400")}
      </div>

      {/* 3. Solution (Green/Emerald) */}
      <div className="glass-card rounded-3xl overflow-hidden shadow-xl shadow-black/20 border-l-4 border-l-emerald-500">
        <div className="bg-emerald-900/20 p-5 border-b border-emerald-500/10 flex items-center space-x-4">
           <div className="bg-emerald-500/20 p-2.5 rounded-xl text-emerald-400">
             <CheckCircle className="w-6 h-6" />
           </div>
          <h2 className="text-xl font-bold text-emerald-100 tracking-wide">Step-by-Step Solution</h2>
        </div>
        <div className="p-6 md:p-8">
          <ul className="space-y-6">
            {solution.map((step, idx) => {
              const cleanStep = step.replace(/^(\d+\.|-|\*)\s+/, '');
              
              return (
                <li key={idx} className="flex items-start space-x-5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold mt-0.5 border border-emerald-500/20 shadow-sm">
                    {idx + 1}
                  </div>
                  <div className="text-slate-200 text-lg leading-relaxed pt-0.5">
                    {renderFormattedText(cleanStep, "text-emerald-200")}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* 4. Highlighted Issue Area (Violet) - Only if image exists and content is valid */}
      {hasImage && highlightedArea && highlightedArea !== "N/A" && (
        <div className="glass-card rounded-3xl overflow-hidden shadow-xl shadow-black/20 border-l-4 border-l-violet-500">
          <div className="bg-violet-900/20 p-5 border-b border-violet-500/10 flex items-center space-x-4">
            <div className="bg-violet-500/20 p-2.5 rounded-xl text-violet-400">
              <ScanEye className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-violet-100 tracking-wide">Highlighted Issue Area</h2>
          </div>
          {renderSectionContent(highlightedArea, "text-violet-200", "bg-violet-400")}
        </div>
      )}

      {/* 5. Confidence Level */}
      {confidence && confColors && (
        <div className={`glass-card rounded-3xl overflow-hidden shadow-xl shadow-black/20 border-l-4 ${confColors.border}`}>
          <div className={`${confColors.headerBg} p-5 border-b border-white/5 flex items-center space-x-4`}>
             <div className={`${confColors.headerIconBg} p-2.5 rounded-xl ${confColors.text}`}>
                <Activity className="w-6 h-6" />
             </div>
             <h2 className={`text-xl font-bold ${confColors.headerText} tracking-wide`}>Confidence Level</h2>
          </div>
          <div className="p-6 md:p-8">
             <div className="flex flex-col md:flex-row md:items-center gap-6">
                 <div className="flex items-baseline space-x-2">
                   <span className={`text-5xl font-bold ${confColors.text}`}>{confidence.score}%</span>
                   <span className="text-slate-400 text-lg font-medium">{confidence.label}</span>
                 </div>
                 <div className="flex-1 w-full bg-slate-800/50 rounded-full h-3 overflow-hidden border border-white/5">
                    <div 
                      className={`h-full rounded-full ${confColors.bg} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.3)]`}
                      style={{ width: `${confidence.score}%` }}
                    ></div>
                 </div>
             </div>
             <p className="mt-4 text-slate-400 text-sm leading-relaxed opacity-80">
                A confidence score reflects how certain the AI is about its analysis based on the information you provided. Higher confidence means the AI sees strong patterns supporting its conclusion; lower confidence means the AI is less certain and additional images or clarification may be helpful.
             </p>
          </div>
        </div>
      )}

      {/* 6. Notes (Red/Rose) */}
      {notes && notes.length > 5 && (
        <div className="glass-card rounded-3xl overflow-hidden shadow-xl shadow-black/20 border-l-4 border-l-rose-500">
           <div className="bg-rose-900/20 p-5 border-b border-rose-500/10 flex items-center space-x-4">
             <div className="bg-rose-500/20 p-2.5 rounded-xl text-rose-400">
               <AlertTriangle className="w-6 h-6" />
             </div>
            <h2 className="text-xl font-bold text-rose-100 tracking-wide">Important Notes / Risks</h2>
          </div>
          {renderSectionContent(notes, "text-rose-200", "bg-rose-400")}
        </div>
      )}

       {/* 7. Follow-Up Questions (Gray/Neutral) */}
       {followUpQuestions && (
        <div className="glass-card rounded-3xl overflow-hidden shadow-xl shadow-black/20 border-l-4 border-l-slate-400">
          <div className="bg-slate-900/40 p-5 border-b border-slate-500/10 flex items-center space-x-4">
            <div className="bg-slate-500/20 p-2.5 rounded-xl text-slate-300">
              <CircleHelp className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-200 tracking-wide">Follow-Up Questions</h2>
          </div>
          {renderSectionContent(followUpQuestions, "text-slate-200", "bg-slate-400")}
        </div>
      )}

      {/* 8. Quick Action Panels (Tools, Tests, Severity) */}
      {quickActions && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Tools Needed */}
          <div className="glass-card rounded-3xl p-6 border-t-4 border-t-cyan-500 shadow-lg shadow-black/20 hover:translate-y-[-2px] transition-transform">
             <div className="flex items-center space-x-3 mb-4">
               <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400">
                 <Wrench className="w-5 h-5" />
               </div>
               <h3 className="font-bold text-cyan-100">Tools Needed</h3>
             </div>
             <p className="text-slate-300 text-sm leading-relaxed">
               {quickActions.tools}
             </p>
          </div>

          {/* Recommended Tests */}
          <div className="glass-card rounded-3xl p-6 border-t-4 border-t-purple-500 shadow-lg shadow-black/20 hover:translate-y-[-2px] transition-transform">
             <div className="flex items-center space-x-3 mb-4">
               <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                 <ClipboardList className="w-5 h-5" />
               </div>
               <h3 className="font-bold text-purple-100">Recommended Tests</h3>
             </div>
             <p className="text-slate-300 text-sm leading-relaxed">
               {quickActions.tests}
             </p>
          </div>

          {/* Severity Level */}
          <div className={`glass-card rounded-3xl p-6 border-t-4 shadow-lg shadow-black/20 hover:translate-y-[-2px] transition-transform ${severityColors.border}`}>
             <div className="flex items-center space-x-3 mb-4">
               <div className={`p-2 rounded-lg ${severityColors.bgSoft} ${severityColors.text}`}>
                 <AlertOctagon className="w-5 h-5" />
               </div>
               <h3 className={`font-bold ${severityColors.text}`}>Severity: {quickActions.severity.level}</h3>
             </div>
             <p className="text-slate-300 text-sm leading-relaxed">
               {quickActions.severity.explanation}
             </p>
          </div>
        </div>
      )}

      {/* 9. Interactive Multimodal Follow-up / Clarification Section */}
      <div className="mt-12 pt-10 border-t border-white/5 space-y-8">
        <div className="flex items-center space-x-3 px-2">
           <div className="p-2 bg-indigo-500/10 rounded-lg">
              <MessageCircle className="w-5 h-5 text-indigo-400" />
           </div>
           <div>
              <h3 className="font-semibold text-xl text-slate-200">Refine Analysis</h3>
              <p className="text-sm text-slate-500">Provide new info to update the solution or ask questions</p>
           </div>
        </div>

        <div className="space-y-6 px-1">
          {qaItems.map((item, index) => (
            <div key={index} className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-end">
                <div className="bg-indigo-600 text-white px-6 py-3 rounded-2xl rounded-tr-sm shadow-lg shadow-indigo-900/20 max-w-[85%] text-lg leading-relaxed">
                  {item.question}
                </div>
              </div>
              <div className="flex justify-start">
                 <div className="glass-card text-slate-300 px-6 py-4 rounded-2xl rounded-tl-sm border-slate-700/50 max-w-[90%] flex gap-4 shadow-md">
                   <div className="flex-shrink-0 mt-1">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                   </div>
                   <div className="leading-relaxed whitespace-pre-wrap text-lg">
                      {renderFormattedText(item.answer, "text-indigo-300")}
                   </div>
                 </div>
              </div>
            </div>
          ))}
          <div ref={qaEndRef} />
        </div>

        <form onSubmit={handleSend} className="relative space-y-4">
           
           {/* Attachments Preview */}
           {(followUpImages.length > 0 || followUpAudio) && (
             <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {followUpImages.map((file, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 group">
                    <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="preview" />
                    <button type="button" onClick={() => removeImage(idx)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {followUpAudio && (
                  <div className="relative h-16 px-4 bg-indigo-900/30 rounded-lg border border-indigo-500/30 flex items-center justify-center flex-shrink-0 group">
                     <Mic className="w-5 h-5 text-indigo-400" />
                     <button type="button" onClick={() => setFollowUpAudio(null)} className="absolute top-1 right-1 text-slate-400 hover:text-white p-0.5 rounded-full bg-black/20">
                       <X size={10} />
                     </button>
                  </div>
                )}
             </div>
           )}

           <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur-sm"></div>
            
            <div className="relative flex items-center bg-slate-900/90 border border-white/10 rounded-2xl shadow-xl transition-all p-1">
              
              {/* Media Buttons */}
              <div className="flex items-center px-2 gap-1 border-r border-white/5">
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-slate-400 hover:text-indigo-400 hover:bg-white/5 rounded-xl transition-colors"
                  title="Add Images"
                >
                  <ImageIcon size={20} />
                </button>
                <button 
                  type="button" 
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-2.5 rounded-xl transition-colors ${isRecording ? 'text-red-400 bg-red-500/10 animate-pulse' : 'text-slate-400 hover:text-red-400 hover:bg-white/5'}`}
                  title="Record Audio"
                >
                  {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
              </div>

              <input
                type="text"
                className="w-full bg-transparent border-none py-4 px-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-0 text-lg"
                placeholder={isRecording ? "Recording..." : "Type a message or upload new details..."}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={isAsking || isRecording}
              />
              
              <button
                type="submit"
                disabled={(!question.trim() && followUpImages.length === 0 && !followUpAudio) || isAsking || isRecording}
                className="mr-2 p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-50 disabled:bg-slate-700 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-900/20"
              >
                {isAsking ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

    </div>
  );
};

export default ResultSection;
