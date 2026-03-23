import React from 'react';
import { Bot, Sparkles } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="w-full py-4 px-6 flex items-center justify-between border-b border-white/5 bg-slate-950/60 backdrop-blur-xl sticky top-0 z-50">
      <div className="flex items-center space-x-3">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-purple-500/20">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Problem Solver
          </h1>
          <p className="text-xs text-slate-400 font-medium tracking-wide">AI Reasoning Agent</p>
        </div>
      </div>
      
      <div className="hidden md:flex items-center space-x-2 text-slate-400 text-sm bg-slate-900/50 px-3 py-1.5 rounded-full border border-white/5">
        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        <span>Multimodal Analysis</span>
      </div>
    </header>
  );
};

export default Header;