import React from 'react';

interface Props {
  onSelect: (mode: 'TABLE' | 'INTERVIEW') => void;
}

const WizardProcess: React.FC<Props> = ({ onSelect }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in zoom-in-95">
      <div className="text-center">
        <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4">Select Entry Protocol</h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">Choose your preferred academic logging workflow</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <button 
          onClick={() => onSelect('TABLE')}
          className="group relative bg-white p-12 rounded-[3.5rem] border-4 border-slate-100 hover:border-sky-600 hover:shadow-2xl transition-all text-center flex flex-col items-center gap-6"
        >
          <div className="w-24 h-24 bg-sky-50 text-sky-600 rounded-[2rem] flex items-center justify-center text-5xl group-hover:scale-110 transition-transform">📝</div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">1: Assessment Sheet</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed px-4">Traditional broadsheet matrix for bulk score entry and comprehensive overview.</p>
          </div>
          <div className="mt-4 px-8 py-3 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Launch Direct Mode</div>
        </button>

        <button 
          onClick={() => onSelect('INTERVIEW')}
          className="group relative bg-white p-12 rounded-[3.5rem] border-4 border-slate-100 hover:border-indigo-600 hover:shadow-2xl transition-all text-center flex flex-col items-center gap-6"
        >
          <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center text-5xl group-hover:scale-110 transition-transform">⚡</div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Use CAPI Style</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed px-4">Interactive pulse mode with high-focus cards. Ideal for mobile or rapid individual entry.</p>
          </div>
          <div className="mt-4 px-8 py-3 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Launch Pulse Mode</div>
        </button>
      </div>
    </div>
  );
};

export default WizardProcess;