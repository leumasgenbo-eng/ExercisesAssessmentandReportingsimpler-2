import React, { useState, useMemo } from 'react';
import { AppState, SpecialPupilRecord, SpecialNeedsAudit, AssessmentData, ExerciseMetadata } from '../../types';
import { SCHOOL_HIERARCHY, SPECIAL_NEEDS_CATEGORIES, LEARNING_APPROACHES, WEEK_COUNT } from '../../constants';

interface Props {
  fullState: AppState;
  onUpdateManagement: (data: any) => void;
}

type Tab = 'CLASSIFICATION' | 'CONFIRMATION' | 'ANALYSIS' | 'AUDIT';

const SpecialNeedsPortal: React.FC<Props> = ({ fullState, onUpdateManagement }) => {
  const [activeTab, setActiveTab] = useState<Tab>('CLASSIFICATION');
  const [selectedClass, setSelectedClass] = useState('Basic 1A');
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [newRecord, setNewRecord] = useState<Partial<SpecialPupilRecord>>({
    severity: 'MILD',
    category: SPECIAL_NEEDS_CATEGORIES[0],
    learningApproach: LEARNING_APPROACHES[0]
  });

  const registry = fullState.management.specialNeedsRegistry || [];
  const audits = fullState.management.specialNeedsAudits || [];

  const allClasses = useMemo(() => Object.values(SCHOOL_HIERARCHY).flatMap(g => g.classes), []);

  const getPupilPerformance = (pupilId: string) => {
    let scores: number[] = [];
    let possible: number[] = [];

    (['classWork', 'homeWork', 'projectWork'] as const).forEach(cat => {
      Object.values(fullState[cat]).forEach((data: AssessmentData) => {
        const p = data.pupils.find(pup => pup.studentId === pupilId || pup.id === pupilId);
        if (p) {
          Object.entries(p.scores).forEach(([exId, val]) => {
            const numVal = parseFloat(val);
            const maxVal = parseFloat(data.exercises[parseInt(exId)]?.maxScore || '10');
            if (!isNaN(numVal)) {
              scores.push(numVal);
              possible.push(maxVal);
            }
          });
        }
      });
    });

    const sumScores = scores.reduce((a, b) => a + b, 0);
    const sumPossible = possible.reduce((a, b) => a + b, 0);
    return sumPossible > 0 ? (sumScores / sumPossible) * 100 : null;
  };

  const handleAddRecord = () => {
    if (!newRecord.pupilId || !newRecord.facilitatorNote) return;
    const pupil = (fullState.management.masterPupils[selectedClass] || []).find(p => p.studentId === newRecord.pupilId);
    
    const record: SpecialPupilRecord = {
      ...newRecord as any,
      pupilName: pupil?.name || 'Unknown',
      className: selectedClass,
      specialistConfirmed: false,
      timestamp: new Date().toISOString()
    };

    onUpdateManagement({
      ...fullState.management,
      specialNeedsRegistry: [...registry, record]
    });
    setIsAdding(false);
    setNewRecord({ severity: 'MILD', category: SPECIAL_NEEDS_CATEGORIES[0], learningApproach: LEARNING_APPROACHES[0] });
  };

  const handleConfirm = (pupilId: string, note: string) => {
    const updated = registry.map(r => r.pupilId === pupilId ? { ...r, specialistConfirmed: true, specialistNote: note } : r);
    onUpdateManagement({ ...fullState.management, specialNeedsRegistry: updated });
  };

  const handleAudit = (timeframe: 'WEEK' | 'MONTH' | 'TERM' | 'YEAR', val: string) => {
    const newAudit: SpecialNeedsAudit = {
      id: `audit-${Date.now()}`,
      timeframe,
      value: val,
      timestamp: new Date().toISOString(),
      auditorId: 'Institutional Auditor',
      aggregateAnalysis: `Audit conducted for ${timeframe} ${val}. Total special needs pupils monitored: ${registry.length}.`,
      complianceScore: (registry.filter(r => r.specialistConfirmed).length / (registry.length || 1)) * 100
    };

    onUpdateManagement({
      ...fullState.management,
      specialNeedsAudits: [newAudit, ...audits]
    });
    alert("Audit Statement Dispatched.");
  };

  return (
    <div className="space-y-10 animate-in">
      <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-10">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <span className="bg-indigo-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Special Needs Portal</span>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">United Baylor Institutional Support</p>
          </div>
          <h3 className="text-4xl font-black uppercase tracking-tighter">Clinical Monitoring</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-2">Specialist Node Hierarchy</p>
        </div>
        <div className="flex bg-white/5 p-2 rounded-[2rem] overflow-x-auto scrollbar-hide">
          {(['CLASSIFICATION', 'CONFIRMATION', 'ANALYSIS', 'AUDIT'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'CLASSIFICATION' && (
        <div className="space-y-8">
          <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
             <div className="space-y-1">
                <h4 className="text-xl font-black text-slate-900 uppercase">Facilitator Classification</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Identify and log pupils requiring specialist intervention</p>
             </div>
             <button onClick={() => setIsAdding(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all">New Classification +</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {registry.map((r, idx) => (
              <div key={idx} className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl hover:shadow-2xl transition-all relative group overflow-hidden">
                <div className={`absolute top-0 right-0 px-4 py-2 text-[8px] font-black uppercase rounded-bl-2xl text-white ${r.specialistConfirmed ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                  {r.specialistConfirmed ? 'Verified by Specialist' : 'Pending Confirmation'}
                </div>
                <div className="flex items-center gap-4 mb-6">
                   <div className="w-12 h-12 bg-slate-950 text-white rounded-xl flex items-center justify-center text-xl font-black">{r.pupilName.charAt(0)}</div>
                   <div>
                      <div className="font-black text-slate-900 uppercase text-xs">{r.pupilName}</div>
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{r.className}</div>
                   </div>
                </div>
                <div className="space-y-4">
                   <div>
                      <label className="text-[7px] font-black text-slate-300 uppercase tracking-widest block mb-1">Category</label>
                      <div className="text-[10px] font-black text-slate-900 uppercase bg-slate-50 p-2 rounded-lg">{r.category}</div>
                   </div>
                   <div>
                      <label className="text-[7px] font-black text-slate-300 uppercase tracking-widest block mb-1">Severity</label>
                      <div className={`text-[10px] font-black uppercase inline-block px-3 py-1 rounded-full ${r.severity === 'SEVERE' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>{r.severity}</div>
                   </div>
                   <div className="pt-4 border-t border-slate-50 italic text-[9px] text-slate-500 leading-relaxed">
                     "{r.facilitatorNote}"
                   </div>
                </div>
              </div>
            ))}
          </div>

          {isAdding && (
            <div className="fixed inset-0 z-[6000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
              <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl border-4 border-slate-900">
                 <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-8 text-center">Institutional Classification</h4>
                 <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Class Registry</label>
                          <select className="w-full bg-slate-50 border-2 p-4 rounded-2xl font-black uppercase text-xs" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                             {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Pupil</label>
                          <select className="w-full bg-slate-50 border-2 p-4 rounded-2xl font-black uppercase text-xs" value={newRecord.pupilId} onChange={(e) => setNewRecord({...newRecord, pupilId: e.target.value})}>
                             <option value="">- SELECT PUPIL -</option>
                             {(fullState.management.masterPupils[selectedClass] || []).map(p => <option key={p.studentId} value={p.studentId}>{p.name}</option>)}
                          </select>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Special Needs Category</label>
                       <select className="w-full bg-slate-50 border-2 p-4 rounded-2xl font-black uppercase text-xs" value={newRecord.category} onChange={(e) => setNewRecord({...newRecord, category: e.target.value})}>
                          {SPECIAL_NEEDS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Initial Observation Log</label>
                       <textarea className="w-full bg-slate-50 border-2 p-5 rounded-[2rem] font-bold text-xs h-32 resize-none" placeholder="Detailed facilitator observation..." value={newRecord.facilitatorNote} onChange={(e) => setNewRecord({...newRecord, facilitatorNote: e.target.value})} />
                    </div>
                    <div className="flex gap-4 pt-4">
                       <button onClick={() => setIsAdding(false)} className="flex-1 py-5 border-2 rounded-2xl font-black uppercase text-[10px]">Cancel</button>
                       <button onClick={handleAddRecord} className="flex-[2] bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] shadow-xl">Submit for Specialist Verification</button>
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'CONFIRMATION' && (
        <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl overflow-hidden">
           <h4 className="text-xl font-black text-slate-900 uppercase mb-10 border-b-2 border-slate-50 pb-6">Specialist Confirmation Queue</h4>
           <div className="space-y-6">
              {registry.filter(r => !r.specialistConfirmed).length > 0 ? registry.filter(r => !r.specialistConfirmed).map((r, i) => (
                <div key={i} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row justify-between gap-10 group hover:bg-white hover:border-indigo-100 transition-all">
                   <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-4">
                         <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg">{r.pupilName.charAt(0)}</div>
                         <div>
                            <div className="font-black text-slate-900 uppercase text-sm tracking-tight">{r.pupilName}</div>
                            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{r.category} • {r.className}</div>
                         </div>
                      </div>
                      <p className="text-xs text-slate-600 italic leading-relaxed">"Facilitator Note: {r.facilitatorNote}"</p>
                   </div>
                   <div className="w-full md:w-96 space-y-4">
                      <textarea id={`spec-note-${r.pupilId}`} className="w-full bg-white border-2 p-4 rounded-2xl text-[10px] font-bold h-24 resize-none outline-none focus:border-indigo-600" placeholder="Clinical Specialist Final Verdict..." />
                      <button 
                        onClick={() => {
                          const note = (document.getElementById(`spec-note-${r.pupilId}`) as HTMLTextAreaElement).value;
                          handleConfirm(r.pupilId, note);
                        }} 
                        className="w-full bg-slate-950 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-black"
                      >Verify & Set Approach</button>
                   </div>
                </div>
              )) : (
                <div className="py-20 text-center opacity-20 flex flex-col items-center">
                   <div className="text-6xl mb-4">✅</div>
                   <p className="font-black uppercase tracking-widest text-[10px]">No pending Specialist verifications</p>
                </div>
              )}
           </div>
        </div>
      )}

      {activeTab === 'ANALYSIS' && (
        <div className="space-y-8 animate-in">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {registry.filter(r => r.specialistConfirmed).map((r, i) => {
                const perf = getPupilPerformance(r.pupilId);
                return (
                  <div key={i} className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-8">
                     <div className="flex justify-between items-start">
                        <div>
                           <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">{r.pupilName}</h4>
                           <span className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em]">{r.category}</span>
                        </div>
                        <div className="text-right">
                           <div className={`text-4xl font-black ${perf && perf >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>{perf ? perf.toFixed(1) : '--'}%</div>
                           <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Rigor Compliance</span>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                           <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-2">Prescribed Approach</label>
                           <div className="text-xs font-black text-slate-900 uppercase mb-3">{r.learningApproach}</div>
                           <p className="text-[10px] text-slate-500 italic leading-relaxed">Recommendation: {r.furtherRecommendations || "Maintain current scaffolding framework."}</p>
                        </div>

                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest block">Specialist Diagnostic Summary</label>
                           <div className="text-xs font-bold text-slate-700 bg-white p-4 rounded-xl border border-slate-100 shadow-inner">
                              {r.specialistNote}
                           </div>
                        </div>
                     </div>
                  </div>
                );
              })}
           </div>
        </div>
      )}

      {activeTab === 'AUDIT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl">
                 <h4 className="text-lg font-black uppercase mb-6">Dispatch Audit</h4>
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Timeframe Scope</label>
                       <div className="grid grid-cols-2 gap-2">
                          {(['WEEK', 'MONTH', 'TERM', 'YEAR'] as const).map(tf => (
                            <button key={tf} onClick={() => handleAudit(tf, 'Active Cycle')} className="bg-white/10 p-4 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-white/20 transition-all border border-white/5">{tf}</button>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           <div className="lg:col-span-8 bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl h-fit">
              <h4 className="text-xl font-black text-slate-900 uppercase mb-10 border-b-2 border-slate-50 pb-6">Audit Statement Archive</h4>
              <div className="space-y-4">
                 {audits.length > 0 ? audits.map(a => (
                    <div key={a.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-indigo-600 transition-all">
                       <div className="flex justify-between items-start mb-4">
                          <div>
                             <span className="bg-indigo-600 text-white text-[8px] font-black px-3 py-1 rounded-md uppercase tracking-widest">{a.timeframe} AUDIT</span>
                             <div className="text-xs font-black text-slate-900 uppercase mt-2">{a.value}</div>
                          </div>
                          <div className="text-right">
                             <div className="text-lg font-black text-indigo-600">{a.complianceScore.toFixed(0)}%</div>
                             <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Compliance</span>
                          </div>
                       </div>
                       <p className="text-[10px] text-slate-500 leading-relaxed">{a.aggregateAnalysis}</p>
                       <div className="text-[7px] font-black text-slate-300 uppercase tracking-widest mt-4">Administrative Node • {new Date(a.timestamp).toLocaleString()}</div>
                    </div>
                 )) : (
                    <div className="py-20 text-center opacity-20 flex flex-col items-center">
                       <div className="text-6xl mb-4">🏛️</div>
                       <p className="font-black uppercase tracking-widest text-[10px]">No historical audit statements found</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SpecialNeedsPortal;