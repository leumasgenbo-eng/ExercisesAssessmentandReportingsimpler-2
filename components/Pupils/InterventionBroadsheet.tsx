
import React, { useState, useMemo } from 'react';
import { AppState, AssessmentData, InterventionRecord } from '../../types';
import { SCHOOL_HIERARCHY, INTERVENTION_REASONS } from '../../constants';

interface Props {
  fullState: AppState;
}

const InterventionBroadsheet: React.FC<Props> = ({ fullState }) => {
  const [filterClass, setFilterClass] = useState('');
  const [filterReason, setFilterReason] = useState('');

  const allClasses = useMemo(() => 
    Object.values(SCHOOL_HIERARCHY).flatMap(group => group.classes), 
  []);

  const interventionData = useMemo(() => {
    const flatList: ({ pupilName: string, className: string } & InterventionRecord)[] = [];

    (['classWork', 'homeWork', 'projectWork'] as const).forEach(cat => {
      Object.values(fullState[cat]).forEach((data: AssessmentData) => {
        data.pupils.forEach(p => {
          if (p.interventions && p.interventions.length > 0) {
            p.interventions.forEach(int => {
              const matchesClass = filterClass ? data.className === filterClass : true;
              const matchesReason = filterReason ? int.reasonCategory === filterReason : true;

              if (matchesClass && matchesReason) {
                flatList.push({
                  ...int,
                  pupilName: p.name,
                  className: data.className
                });
              }
            });
          }
        });
      });
    });

    return flatList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [fullState, filterClass, filterReason]);

  const stats = useMemo(() => {
    const total = interventionData.length;
    const reasonCounts: Record<string, number> = {};
    interventionData.forEach(i => {
      reasonCounts[i.reasonCategory] = (reasonCounts[i.reasonCategory] || 0) + 1;
    });
    const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0];
    return { total, topReason };
  }, [interventionData]);

  return (
    <div className="animate-in space-y-8 pb-20">
      {/* STATS STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
        <div className="bg-rose-600 rounded-[2rem] p-8 text-white shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block mb-1">Total Academic Support Flags</span>
            <div className="text-4xl font-black">{stats.total}</div>
          </div>
          <div className="text-5xl opacity-20">🛡️</div>
        </div>
        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Primary Academic Concern</span>
            <div className="text-xl font-black text-slate-900 truncate max-w-[250px] uppercase">
              {stats.topReason ? stats.topReason[0].split(':')[1].trim() : 'NONE'}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black text-rose-500 uppercase block">{stats.topReason ? stats.topReason[1] : 0} Cases</span>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-xl flex flex-col md:flex-row gap-6 md:items-end no-print">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Class Filter</label>
          <select 
            className="w-full bg-slate-50 border-2 border-transparent focus:border-rose-500 p-4 rounded-2xl font-black text-slate-900 uppercase text-xs outline-none cursor-pointer transition-all"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            <option value="">ALL CLASSES</option>
            {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Taxonomy</label>
          <select 
            className="w-full bg-slate-50 border-2 border-transparent focus:border-rose-500 p-4 rounded-2xl font-black text-slate-900 uppercase text-xs outline-none cursor-pointer transition-all"
            value={filterReason}
            onChange={(e) => setFilterReason(e.target.value)}
          >
            <option value="">ALL REASONS</option>
            {INTERVENTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="shrink-0 flex gap-2">
           <button onClick={() => window.print()} className="bg-rose-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all">Export Support Broad Sheet</button>
        </div>
      </div>

      {/* INTERVENTION TABLE */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest w-20 text-center">SN</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest w-64">Pupil & Class</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest w-32 text-center">Date/Week</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest">Reason Category</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest">Prescribed Action</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-right pr-12 w-40">Recorder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {interventionData.length > 0 ? (
                interventionData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-rose-50/30 transition-colors group">
                    <td className="px-8 py-6 text-[10px] font-black text-slate-300 text-center">{idx + 1}</td>
                    <td className="px-8 py-6">
                      <div className="font-black text-slate-900 uppercase text-xs tracking-tight">{item.pupilName}</div>
                      <div className="text-[8px] font-bold text-rose-400 uppercase mt-0.5 tracking-widest">{item.className}</div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="text-[10px] font-black text-slate-900 uppercase leading-none">{item.date}</div>
                      <div className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Wk {item.week}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-[10px] font-black text-rose-600 uppercase leading-tight bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 inline-block">
                        {item.reasonCategory}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-[10px] font-bold text-sky-900 uppercase leading-tight">
                        {item.actionTaken}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right pr-12">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                        {item.facilitator}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-32 text-center">
                    <div className="flex flex-col items-center opacity-20">
                       <div className="text-5xl mb-4 text-slate-300">🛡️</div>
                       <p className="font-black uppercase tracking-widest text-[10px]">No academic support records found in the current hub</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InterventionBroadsheet;
