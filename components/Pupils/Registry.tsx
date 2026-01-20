
import React, { useState, useMemo } from 'react';
import { AppState, AssessmentData, Pupil, InterventionRecord } from '../../types';
import { INTERVENTION_REASONS, INTERVENTION_ACTIONS, WEEK_COUNT, SCHOOL_HIERARCHY } from '../../constants';

interface Props {
  fullState: AppState;
}

const Registry: React.FC<Props> = ({ fullState }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPupilId, setSelectedPupilId] = useState<string | null>(null);
  const [filterClass, setFilterClass] = useState('');

  const allPupils = useMemo(() => {
    const pupilMap = new Map<string, { id: string, name: string, className: string, interventions: InterventionRecord[] }>();
    (['classWork', 'homeWork', 'projectWork'] as const).forEach(cat => {
      Object.values(fullState[cat]).forEach((data: AssessmentData) => {
        data.pupils.forEach(p => {
          if (p.name && !p.id.startsWith('empty-') && !p.id.startsWith('auto-')) {
            const existing = pupilMap.get(p.id);
            const combinedInterventions = [...(existing?.interventions || []), ...(p.interventions || [])];
            const uniqueInterventions = Array.from(new Map(combinedInterventions.map(i => [i.id, i])).values());
            pupilMap.set(p.id, { id: p.id, name: p.name, className: data.className, interventions: uniqueInterventions });
          }
        });
      });
    });
    return Array.from(pupilMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [fullState]);

  const filteredPupils = useMemo(() => {
    return allPupils.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = filterClass ? p.className === filterClass : true;
      return matchesSearch && matchesClass;
    });
  }, [allPupils, searchTerm, filterClass]);

  const selectedPupil = allPupils.find(p => p.id === selectedPupilId);
  
  const pupilRecords = useMemo(() => {
    if (!selectedPupilId) return [];
    const records: { week: string, subject: string, category: string, scores: string[] }[] = [];
    (['classWork', 'homeWork', 'projectWork'] as const).forEach(cat => {
      Object.values(fullState[cat]).forEach((data: AssessmentData) => {
        const p = data.pupils.find(pup => pup.id === selectedPupilId);
        if (p) {
          records.push({
            week: data.week,
            subject: data.subject || 'N/A',
            category: cat.replace('Work', '').toUpperCase(),
            scores: Object.values(p.scores) as string[]
          });
        }
      });
    });
    return records.sort((a, b) => parseInt(a.week) - parseInt(b.week));
  }, [selectedPupilId, fullState]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in">
      {/* SIDEBAR */}
      <div className="lg:w-80 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[600px] lg:h-[700px] shrink-0">
        <div className="p-6 bg-slate-900 text-white shrink-0">
          <h3 className="text-lg font-black uppercase mb-4 tracking-tighter">Pupil Registry</h3>
          <div className="space-y-2">
            <input 
              type="text" 
              className="w-full bg-white/10 border border-white/20 p-2.5 rounded-xl text-[10px] font-black uppercase placeholder-white/30 outline-none focus:bg-white/20 transition-all" 
              placeholder="Search Name..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
            <select 
              className="w-full bg-white/10 border border-white/20 p-2.5 rounded-xl text-[10px] font-black uppercase text-white/70 outline-none"
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
            >
              <option value="" className="text-slate-900">All Classes</option>
              {Object.values(SCHOOL_HIERARCHY).flatMap(g => g.classes).map(c => (
                <option key={c} value={c} className="text-slate-900">{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide bg-slate-50/30">
          {filteredPupils.length > 0 ? (
            filteredPupils.map(p => (
              <button 
                key={p.id} 
                onClick={() => setSelectedPupilId(p.id)} 
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all group ${selectedPupilId === p.id ? 'bg-white border-slate-900 shadow-lg' : 'bg-white border-transparent hover:border-slate-200'}`}
              >
                <div className={`font-black uppercase text-xs ${selectedPupilId === p.id ? 'text-slate-900' : 'text-slate-600'}`}>{p.name}</div>
                <div className="text-[8px] font-bold text-slate-400 uppercase mt-1">{p.className}</div>
              </button>
            ))
          ) : (
            <div className="py-20 text-center opacity-20">
              <p className="font-black uppercase tracking-widest text-[10px]">No matches</p>
            </div>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 space-y-6">
        {selectedPupil ? (
          <div className="space-y-6">
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-2xl font-black">
                  {selectedPupil.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{selectedPupil.name}</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Identity Confirmed • {selectedPupil.className}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-center">
                  <span className="block text-[8px] font-black text-slate-400 uppercase">Records</span>
                  <span className="text-sm font-black text-slate-900">{pupilRecords.length}</span>
                </div>
                <div className="px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl text-center">
                  <span className="block text-[8px] font-black text-rose-400 uppercase">Support</span>
                  <span className="text-sm font-black text-rose-600">{selectedPupil.interventions.length}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* INTERVENTIONS */}
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl">
                <h4 className="text-sm font-black text-slate-900 uppercase mb-8 flex items-center gap-2 tracking-widest">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  Academic Support History
                </h4>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
                    {selectedPupil.interventions.length > 0 ? selectedPupil.interventions.reverse().map(int => (
                      <div key={int.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Week {int.week} • {int.subject}</div>
                          <div className="text-[8px] font-bold text-slate-300">{int.date}</div>
                        </div>
                        <div className="text-xs font-black text-slate-900 uppercase leading-tight mb-3">{int.reasonCategory}</div>
                        <div className="text-[10px] font-bold text-sky-900 bg-sky-50/50 p-3 rounded-xl border border-sky-100 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0"></span>
                          {int.actionTaken}
                        </div>
                      </div>
                    )) : (
                      <div className="py-20 text-center opacity-20"><p className="font-black uppercase tracking-widest text-[10px]">No behavioral/academic flags</p></div>
                    )}
                </div>
              </div>

              {/* RECENT SCORES */}
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl">
                <h4 className="text-sm font-black text-slate-900 uppercase mb-8 flex items-center gap-2 tracking-widest">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  Activity Stream
                </h4>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
                  {pupilRecords.length > 0 ? pupilRecords.reverse().map((rec, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-10 h-10 rounded-xl bg-white flex flex-col items-center justify-center border border-slate-200 shrink-0">
                        <span className="text-[7px] font-black text-slate-400 uppercase leading-none">Wk</span>
                        <span className="text-xs font-black text-slate-900">{rec.week}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-black text-slate-900 uppercase truncate leading-none mb-1">{rec.subject}</div>
                        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{rec.category}</div>
                      </div>
                      <div className="flex gap-1">
                        {rec.scores.map((s, si) => (
                          <div key={si} className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-[9px] font-black text-slate-600">
                            {s || '-'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )) : (
                    <div className="py-20 text-center opacity-20"><p className="font-black uppercase tracking-widest text-[10px]">No logged scores</p></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-white/40 rounded-[3rem] border border-slate-200 text-center px-6 min-h-[500px] shadow-sm">
            <div className="text-6xl mb-6 opacity-10">👤</div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Unified Pupil Intel</h3>
            <p className="text-[10px] text-slate-400 uppercase mt-2 tracking-widest max-w-xs leading-relaxed">Retrieve institutional archives by selecting a pupil from the registry.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Registry;
