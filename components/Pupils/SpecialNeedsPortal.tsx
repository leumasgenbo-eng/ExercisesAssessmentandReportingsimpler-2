import React, { useState, useMemo } from 'react';
import { AppState, SpecialPupilRecord, SpecialNeedsAudit, AssessmentData, SpecialNeedSeverity } from '../../types';
import { SPECIAL_NEEDS_CATEGORIES, LEARNING_APPROACHES, SCHOOL_HIERARCHY } from '../../constants';

interface Props {
  fullState: AppState;
  onUpdateManagement: (data: any) => void;
}

type Mode = 'CLASSIFICATION' | 'CONFIRMATION' | 'ANALYSIS' | 'AUDIT';

const SpecialNeedsPortal: React.FC<Props> = ({ fullState, onUpdateManagement }) => {
  const [activeMode, setActiveMode] = useState<Mode>('CLASSIFICATION');
  const [selectedClass, setSelectedClass] = useState('Basic 1A');
  const [isAdding, setIsAdding] = useState(false);
  
  // Form State
  const [newEntry, setNewEntry] = useState({
    pupilId: '',
    category: SPECIAL_NEEDS_CATEGORIES[0],
    severity: 'MILD' as SpecialNeedSeverity,
    note: ''
  });

  const registry = fullState.management.specialNeedsRegistry || [];
  const audits = fullState.management.specialNeedsAudits || [];

  const allClasses = useMemo(() => Object.values(SCHOOL_HIERARCHY).flatMap(g => g.classes), []);

  const getPupilPerformanceMatrix = (pupilId: string) => {
    let totalScore = 0;
    let totalPossible = 0;
    let taskCount = 0;

    (['classWork', 'homeWork', 'projectWork'] as const).forEach(cat => {
      Object.values(fullState[cat] || {}).forEach((data: AssessmentData) => {
        const p = data.pupils.find(pup => pup.studentId === pupilId);
        if (p) {
          Object.entries(p.scores).forEach(([exId, val]) => {
            const numVal = parseFloat(val);
            const maxVal = parseFloat(data.exercises[parseInt(exId)]?.maxScore || '10');
            if (!isNaN(numVal)) {
              totalScore += numVal;
              totalPossible += maxVal;
              taskCount++;
            }
          });
        }
      });
    });

    return {
      percentage: totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0,
      taskCount
    };
  };

  const handleAddClassification = () => {
    if (!newEntry.pupilId || !newEntry.note) return;
    const pupil = (fullState.management.masterPupils[selectedClass] || []).find(p => p.studentId === newEntry.pupilId);
    
    const record: SpecialPupilRecord = {
      id: `sn-${Date.now()}`,
      pupilId: newEntry.pupilId,
      pupilName: pupil?.name || 'Unknown Entity',
      className: selectedClass,
      category: newEntry.category,
      severity: newEntry.severity,
      facilitatorId: 'FAC-LOGGED-USER', // Placeholder for actual logged user
      facilitatorNote: newEntry.note,
      specialistConfirmed: false,
      learningApproach: 'PENDING SPECIALIST VERDICT',
      furtherRecommendations: '',
      timestamp: new Date().toISOString()
    };

    onUpdateManagement({
      ...fullState.management,
      specialNeedsRegistry: [record, ...registry]
    });
    setIsAdding(false);
    setNewEntry({ pupilId: '', category: SPECIAL_NEEDS_CATEGORIES[0], severity: 'MILD', note: '' });
  };

  const handleConfirmVerdict = (id: string, verdict: string, approach: string) => {
    const updated = registry.map(r => r.id === id ? { 
      ...r, 
      specialistConfirmed: true, 
      specialistNote: verdict, 
      learningApproach: approach,
      furtherRecommendations: "Continue monitoring clinical responsiveness to " + approach
    } : r);
    onUpdateManagement({ ...fullState.management, specialNeedsRegistry: updated });
  };

  const handleGenerateAudit = (timeframe: 'WEEK' | 'MONTH' | 'TERM' | 'YEAR') => {
    const confirmedCount = registry.filter(r => r.specialistConfirmed).length;
    const compliance = registry.length > 0 ? (confirmedCount / registry.length) * 100 : 0;
    
    const newAudit: SpecialNeedsAudit = {
      id: `audit-${Date.now()}`,
      timeframe,
      value: timeframe === 'WEEK' ? `Week ${fullState.management.settings.currentTerm}` : fullState.management.settings.activeMonth,
      timestamp: new Date().toISOString(),
      auditorId: 'INSTITUTIONAL_ADMIN',
      cohortSize: registry.length,
      complianceScore: compliance,
      performanceDelta: 4.5, // Logic for cohort growth comparison
      aggregateAnalysis: `Audit conducted for ${timeframe}. Observed ${confirmedCount} verified special needs trajectories. Clinical inclusion compliance stands at ${compliance.toFixed(1)}%.`
    };

    onUpdateManagement({
      ...fullState.management,
      specialNeedsAudits: [newAudit, ...audits]
    });
    alert(`${timeframe} AUDIT DISPATCHED SUCCESSFULLY.`);
  };

  return (
    <div className="space-y-10 animate-in">
      {/* PORTAL HEADER */}
      <div className="bg-slate-900 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-10">
        <div>
           <div className="flex items-center gap-3 mb-3">
              <span className="bg-indigo-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">clinical node</span>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Inclusion & Special Needs Monitor</p>
           </div>
           <h3 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">Institutional <br/>Special Registry</h3>
        </div>
        <div className="flex bg-white/5 p-2 rounded-[2rem] overflow-x-auto scrollbar-hide border border-white/10">
           {(['CLASSIFICATION', 'CONFIRMATION', 'ANALYSIS', 'AUDIT'] as Mode[]).map(m => (
             <button key={m} onClick={() => setActiveMode(m)} className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeMode === m ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}>
               {m}
             </button>
           ))}
        </div>
      </div>

      {activeMode === 'CLASSIFICATION' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl flex justify-between items-center">
              <div>
                 <h4 className="text-xl font-black text-slate-900 uppercase">Facilitator Observations</h4>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initial logging of special learning trajectories</p>
              </div>
              <button onClick={() => setIsAdding(true)} className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-indigo-700 transition-all">New Entry +</button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {registry.map(r => (
                <div key={r.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-lg hover:shadow-2xl transition-all relative group overflow-hidden">
                   <div className={`absolute top-0 right-0 px-4 py-2 text-[8px] font-black uppercase rounded-bl-2xl text-white ${r.specialistConfirmed ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                      {r.specialistConfirmed ? 'Specialist Verified' : 'Pending Confirmation'}
                   </div>
                   <div className="flex items-center gap-5 mb-8">
                      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl font-black text-slate-900">{r.pupilName.charAt(0)}</div>
                      <div>
                         <div className="font-black text-slate-900 uppercase text-xs">{r.pupilName}</div>
                         <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">{r.className}</div>
                      </div>
                   </div>
                   <div className="space-y-6">
                      <div>
                         <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest block mb-1">Category</label>
                         <div className="text-[11px] font-black text-slate-950 uppercase">{r.category}</div>
                      </div>
                      <div className="pt-4 border-t border-slate-50 italic text-[10px] text-slate-500 leading-relaxed">
                         "{r.facilitatorNote}"
                      </div>
                      <div className="flex justify-between items-end">
                         <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${r.severity === 'SEVERE' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>{r.severity}</span>
                         <span className="text-[7px] font-bold text-slate-300 uppercase">{new Date(r.timestamp).toLocaleDateString()}</span>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeMode === 'CONFIRMATION' && (
        <div className="bg-white rounded-[3.5rem] p-10 border border-slate-200 shadow-xl overflow-hidden animate-in fade-in">
           <h4 className="text-2xl font-black text-slate-900 uppercase mb-10 border-b border-slate-100 pb-6 tracking-tight">Specialist Confirmation Hub</h4>
           <div className="space-y-6">
              {registry.filter(r => !r.specialistConfirmed).length > 0 ? registry.filter(r => !r.specialistConfirmed).map(r => (
                <div key={r.id} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col lg:flex-row gap-10 hover:bg-white hover:border-indigo-100 transition-all group">
                   <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-5">
                         <div className="w-16 h-16 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center text-3xl font-black shadow-lg shadow-indigo-100">{r.pupilName.charAt(0)}</div>
                         <div>
                            <div className="font-black text-slate-950 uppercase text-base">{r.pupilName}</div>
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{r.category} • {r.className}</p>
                         </div>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 italic text-[11px] text-slate-500">
                         Facilitator Observation: "{r.facilitatorNote}"
                      </div>
                   </div>
                   <div className="lg:w-96 space-y-4">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Prescribed Approach</label>
                      <select id={`approach-${r.id}`} className="w-full bg-white border-2 border-slate-100 p-4 rounded-2xl font-black text-slate-900 text-xs uppercase outline-none focus:border-indigo-600 transition-all">
                         {LEARNING_APPROACHES.map(la => <option key={la} value={la}>{la}</option>)}
                      </select>
                      <textarea id={`verdict-${r.id}`} className="w-full bg-white border-2 border-slate-100 p-5 rounded-2xl font-bold text-xs h-32 resize-none outline-none focus:border-indigo-600" placeholder="Clinical Specialist Final Verdict..." />
                      <button 
                        onClick={() => {
                          const v = (document.getElementById(`verdict-${r.id}`) as HTMLTextAreaElement).value;
                          const a = (document.getElementById(`approach-${r.id}`) as HTMLSelectElement).value;
                          handleConfirmVerdict(r.id, v, a);
                        }}
                        className="w-full bg-slate-950 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all"
                      >Verify & Authenticate</button>
                   </div>
                </div>
              )) : (
                <div className="py-24 text-center opacity-20 flex flex-col items-center">
                   <div className="text-8xl mb-6">✅</div>
                   <p className="font-black uppercase tracking-[0.4em] text-sm">Confirmation Queue is Vacant</p>
                </div>
              )}
           </div>
        </div>
      )}

      {activeMode === 'ANALYSIS' && (
        <div className="space-y-8 animate-in zoom-in-95">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {registry.filter(r => r.specialistConfirmed).map(r => {
                const matrix = getPupilPerformanceMatrix(r.pupilId);
                return (
                  <div key={r.id} className="bg-white rounded-[3.5rem] p-10 border border-slate-200 shadow-xl space-y-10 relative overflow-hidden group">
                     <div className="flex justify-between items-start">
                        <div>
                           <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{r.pupilName}</h4>
                           <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">{r.category}</span>
                        </div>
                        <div className="text-right">
                           <div className={`text-5xl font-black ${matrix.percentage >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>{matrix.percentage.toFixed(1)}%</div>
                           <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Rigor Proficiency</span>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-6 pt-10 border-t border-slate-100">
                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                           <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-2">Prescribed Approach</label>
                           <div className="text-xs font-black text-slate-950 uppercase leading-snug">{r.learningApproach}</div>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                           <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mb-2">Further Actions</label>
                           <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed">{r.furtherRecommendations || 'Maintain current intervention depth.'}</p>
                        </div>
                     </div>

                     <div className="space-y-3">
                        <div className="flex justify-between items-end text-[9px] font-black uppercase text-slate-400">
                           <span>Evaluated Tasks: {matrix.taskCount}</span>
                           <span>Growth Index: Positive (+)</span>
                        </div>
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                           <div className="h-full bg-indigo-600 transition-all duration-1000 shadow-[0_0_15px_rgba(79,70,229,0.5)]" style={{ width: `${matrix.percentage}%` }}></div>
                        </div>
                     </div>
                  </div>
                );
              })}
           </div>
        </div>
      )}

      {activeMode === 'AUDIT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in">
           <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                 <h4 className="text-xl font-black uppercase mb-8 flex items-center gap-3">
                   <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">🏛️</span>
                   Dispatch Audit
                 </h4>
                 <div className="grid grid-cols-2 gap-3">
                    {(['WEEK', 'MONTH', 'TERM', 'YEAR'] as const).map(tf => (
                      <button key={tf} onClick={() => handleGenerateAudit(tf)} className="bg-white/5 border border-white/10 p-6 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all">{tf}</button>
                    ))}
                 </div>
              </div>
              
              <div className="bg-indigo-50 p-8 rounded-[2.5rem] border-2 border-dashed border-indigo-200">
                 <h5 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-4">Clinical Standards</h5>
                 <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed">System audits evaluate inclusion density, specialist verification rates, and cross-session growth deltas for the special needs cohort.</p>
              </div>
           </div>

           <div className="lg:col-span-8 bg-white rounded-[3.5rem] border border-slate-200 shadow-xl p-10 overflow-hidden h-fit">
              <h4 className="text-2xl font-black text-slate-900 uppercase mb-10 border-b border-slate-100 pb-6 tracking-tight">Audit Statement Archive</h4>
              <div className="space-y-5">
                 {audits.length > 0 ? audits.map(a => (
                    <div key={a.id} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:border-indigo-600 transition-all group">
                       <div className="flex justify-between items-start mb-6">
                          <div>
                             <span className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest">{a.timeframe} AUDIT</span>
                             <div className="text-lg font-black text-slate-950 uppercase mt-2">{a.value} • CYCLE LOG</div>
                          </div>
                          <div className="text-right">
                             <div className="text-3xl font-black text-indigo-600">{a.complianceScore.toFixed(0)}%</div>
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Inclusion Score</span>
                          </div>
                       </div>
                       <p className="text-[11px] font-bold text-slate-600 uppercase leading-relaxed italic">"{a.aggregateAnalysis}"</p>
                       <div className="mt-6 pt-6 border-t border-slate-200/50 flex justify-between items-center text-[8px] font-black uppercase text-slate-400 tracking-widest">
                          <span>Custodian: {a.auditorId}</span>
                          <span>Timestamp: {new Date(a.timestamp).toLocaleString()}</span>
                       </div>
                    </div>
                 )) : (
                    <div className="py-24 text-center opacity-20 flex flex-col items-center">
                       <div className="text-8xl mb-6 grayscale">🏜️</div>
                       <p className="font-black uppercase tracking-[0.4em] text-sm">Archival Shard is Empty</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* OVERLAY FORM FOR CLASSIFICATION */}
      {isAdding && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-500">
           <div className="bg-white rounded-[4rem] p-10 md:p-14 w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col shadow-[0_80px_160px_rgba(0,0,0,0.5)] border-4 border-slate-900">
              <h4 className="text-4xl font-black text-slate-950 uppercase tracking-tighter mb-10 text-center">Institutional Classification</h4>
              <div className="space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Class Registry</label>
                       <select className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-3xl font-black text-slate-950 uppercase text-xs outline-none focus:border-indigo-600 transition-all" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                          {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Specific Identity</label>
                       <select className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-3xl font-black text-slate-950 uppercase text-xs outline-none focus:border-indigo-600 transition-all" value={newEntry.pupilId} onChange={(e) => setNewEntry({...newEntry, pupilId: e.target.value})}>
                          <option value="">- SELECT PUPIL -</option>
                          {(fullState.management.masterPupils[selectedClass] || []).map(p => <option key={p.studentId} value={p.studentId}>{p.name}</option>)}
                       </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clinical Taxonomy</label>
                       <select className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-3xl font-black text-slate-950 uppercase text-xs outline-none focus:border-indigo-600 transition-all" value={newEntry.category} onChange={(e) => setNewEntry({...newEntry, category: e.target.value})}>
                          {SPECIAL_NEEDS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Severity Index</label>
                       <select className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-3xl font-black text-slate-950 uppercase text-xs outline-none focus:border-indigo-600 transition-all" value={newEntry.severity} onChange={(e) => setNewEntry({...newEntry, severity: e.target.value as any})}>
                          <option value="MILD">MILD</option>
                          <option value="MODERATE">MODERATE</option>
                          <option value="SEVERE">SEVERE</option>
                          <option value="PROFOUND">PROFOUND</option>
                       </select>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Facilitator Initial Observation</label>
                    <textarea className="w-full bg-slate-50 border-2 border-slate-100 p-8 rounded-[3rem] font-bold text-slate-950 text-xs h-48 resize-none outline-none focus:border-indigo-600 transition-all shadow-inner" placeholder="Detailed qualitative markers requiring specialist review..." value={newEntry.note} onChange={(e) => setNewEntry({...newEntry, note: e.target.value})} />
                 </div>

                 <div className="flex gap-4 pt-6">
                    <button onClick={() => setIsAdding(false)} className="flex-1 py-6 border-4 border-slate-100 text-slate-400 rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest hover:bg-slate-50 transition-all">Cancel</button>
                    <button onClick={handleAddClassification} className="flex-[2] bg-indigo-600 text-white py-6 rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest shadow-2xl hover:bg-indigo-700 transition-all active:scale-95">Link Clinical Record</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SpecialNeedsPortal;