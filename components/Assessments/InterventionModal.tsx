
import React, { useState } from 'react';
import { Pupil } from '../../types';
import { INTERVENTION_REASONS, INTERVENTION_ACTIONS } from '../../constants';

interface Props {
  pupil: Pupil;
  onClose: () => void;
  onSave: (reason: string, action: string, notes: string) => void;
}

const InterventionModal: React.FC<Props> = ({ pupil, onClose, onSave }) => {
  const [reason, setReason] = useState('');
  const [action, setAction] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
       <div className="bg-white rounded-[3rem] p-10 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-4 border-slate-900">
          <div className="flex justify-between items-start mb-8 border-b border-slate-100 pb-6 shrink-0">
             <div>
                <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2 leading-none">Learning Intervention</h4>
                <p className="text-[11px] font-black text-rose-500 uppercase tracking-[0.2em]">{pupil.name}</p>
             </div>
             <button onClick={onClose} className="text-slate-300 hover:text-rose-500 transition-all p-3 bg-slate-50 rounded-full"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>

          <div className="flex-1 overflow-y-auto pr-4 scrollbar-hide space-y-8">
             <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">Academic Root Cause</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                   {INTERVENTION_REASONS.map(r => (
                     <button key={r} onClick={() => setReason(r)} className={`p-4 rounded-2xl text-[10px] font-black uppercase text-left transition-all border-2 ${reason === r ? 'bg-rose-600 border-rose-600 text-white shadow-xl' : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'}`}>
                       {r}
                     </button>
                   ))}
                </div>
             </div>

             <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">Prescribed Action</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                   {INTERVENTION_ACTIONS.map(a => (
                     <button key={a} onClick={() => setAction(a)} className={`p-4 rounded-2xl text-[10px] font-black uppercase text-left transition-all border-2 ${action === a ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'}`}>
                       {a}
                     </button>
                   ))}
                </div>
             </div>

             <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">Academic Observations</label>
                <textarea className="w-full bg-slate-50 border-2 border-transparent focus:border-slate-200 p-6 rounded-3xl font-bold text-slate-900 text-xs focus:ring-8 focus:ring-slate-100 transition-all resize-none h-40 shadow-inner" placeholder="Academic markers..." value={notes} onChange={(e) => setNotes(e.target.value)} />
             </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 shrink-0">
             <button onClick={() => onSave(reason, action, notes)} className="w-full bg-slate-950 text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-black transition-all">Secure Log Record</button>
          </div>
       </div>
    </div>
  );
};

export default InterventionModal;
