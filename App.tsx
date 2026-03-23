
import React, { useState, useRef } from 'react';
import Header from './components/Header';
import InputSection from './components/InputSection';
import ResultSection from './components/ResultSection';
import { LoadingState, SolverResponse, QAItem } from './types';
import { solveProblem, submitMultimodalFollowUp } from './services/geminiService';

const App: React.FC = () => {
  const [textInput, setTextInput] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [result, setResult] = useState<SolverResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New State for Follow-ups
  const [qaItems, setQaItems] = useState<QAItem[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const chatSessionRef = useRef<any>(null); // Store the Chat object

  const handleSolve = async () => {
    if (!textInput && imageFiles.length === 0 && !audioBlob) {
      alert("Please provide at least one input (Text, Image, or Audio)");
      return;
    }

    setLoadingState(LoadingState.PROCESSING);
    setErrorMsg(null);
    setResult(null);
    setQaItems([]); // Clear previous Q&A
    chatSessionRef.current = null; // Reset chat session

    try {
      // solveProblem now returns { response, chat }
      const { response, chat } = await solveProblem(textInput, imageFiles, audioBlob);
      
      setResult(response);
      chatSessionRef.current = chat;
      setLoadingState(LoadingState.SUCCESS);
      
      setTimeout(() => {
        window.scrollTo({ top: 400, behavior: 'smooth' });
      }, 100);

    } catch (error: any) {
      setLoadingState(LoadingState.ERROR);
      setErrorMsg(error.message || "An unexpected error occurred.");
    }
  };

  const handleAskFollowUp = async (question: string, images: File[], audio: Blob | null) => {
    if (!chatSessionRef.current) return;
    
    setIsAsking(true);
    try {
      const result = await submitMultimodalFollowUp(chatSessionRef.current, question, images, audio);
      
      if (result.type === 'revised') {
        // The model decided to update the analysis
        setResult(result.data);
        // Clear QA history as the context has shifted, or append a note?
        // Let's append a note to the QA history indicating the update
        setQaItems(prev => [...prev, { 
          question: `[Analysis Updated] ${question}`, 
          answer: "I've revised the analysis based on the new information provided. Please review the updated sections above." 
        }]);
      } else {
        // The model confirmed the previous analysis
        setQaItems(prev => [...prev, { 
          question: question || (images.length > 0 ? "[Uploaded Image]" : "[Audio Message]"), 
          answer: result.text 
        }]);
      }

    } catch (error) {
      console.error("Failed to get follow up answer", error);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0a0f1e] to-black text-slate-200 selection:bg-purple-500/30 selection:text-purple-200">
      
      {/* Subtle Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-900/10 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-violet-900/10 rounded-full blur-[120px] opacity-60" />
      </div>

      <Header />

      <main className="relative z-10 container mx-auto px-4 md:px-6 py-10 flex flex-col items-center gap-10">
        
        {/* Intro Text */}
        {!result && (
          <div className="text-center max-w-2xl mb-2 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              Identify. Analyze. <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Solve.</span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              Upload images, record audio, or describe your problem.
              <br className="hidden md:block"/>
              Our AI agent will find the root cause and guide you to a solution.
            </p>
          </div>
        )}

        <InputSection 
          text={textInput}
          setText={setTextInput}
          images={imageFiles}
          setImages={setImageFiles}
          audio={audioBlob}
          setAudio={setAudioBlob}
          loadingState={loadingState}
          onSolve={handleSolve}
        />

        {errorMsg && (
          <div className="w-full max-w-3xl p-5 bg-red-950/30 border border-red-500/30 text-red-200 rounded-2xl text-center shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2">
            {errorMsg}
          </div>
        )}

        {result && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
             <ResultSection 
               response={result} 
               qaItems={qaItems}
               onAskQuestion={handleAskFollowUp}
               isAsking={isAsking}
               hasImage={imageFiles.length > 0}
             />
          </div>
        )}
      </main>
      
      <footer className="w-full text-center py-8 text-slate-600 text-sm relative z-10">
        &copy; {new Date().getFullYear()} Universal Problem Solver. Powered by Gemini.
      </footer>
    </div>
  );
};

export default App;
