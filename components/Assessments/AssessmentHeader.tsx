import React from 'react';
import { AssessmentData, ExerciseMetadata, AssessmentType } from '../../types';
import { CRITERION_SKILLS } from '../../constants';

interface Props {
  type: AssessmentType;
  data: AssessmentData;
  exerciseNumbers: number[];
  availableIndicators: string[];
  onExerciseChange: (id: number[] | 'ALL') => void;
  onMetadataChange: (id: number, field: keyof ExerciseMetadata, value: any) => void;
  onApplyAll: (field: keyof ExerciseMetadata) => void;
  showTotal: boolean;
  isExporting?: boolean;
}

const AssessmentHeader: React.FC<Props> = ({ type, data, exerciseNumbers, availableIndicators, onExerciseChange, onMetadataChange, onApplyAll, showTotal, isExporting = false }) => {
  const isSingleMode = exerciseNumbers.length === 1;
  const isCriterion = type === 'CRITERION';
  
  const showBookStatus = !isSingleMode && !isCriterion;

  const adjustMaxScore = (exId: number, delta: number) => {
    const current = parseFloat(data.exercises[exId]?.maxScore || '100') || 0;
    const newVal = Math.max(0, current + delta);
    onMetadataChange(exId, 'maxScore', newVal.toString());
  };

  const handleIndicatorChange = (exId: number, idx: number, value: string) => {
    const currentCodes = [...(data.exercises[exId]?.indicatorCodes || ['', '', '', '', ''])];
    currentCodes[idx] = value;
    onMetadataChange(exId, 'indicatorCodes', currentCodes);
  };

  const toggleFocus = (num: number) => {
    if (isExporting) return;
    if (isSingleMode && exerciseNumbers[0] === num) {
      onExerciseChange('ALL');
    } else {
      onExerciseChange([num]);
    }
  };

  const colSpanCount = showBookStatus ? 3 : 2;

  return (
    <thead className="bg-slate-50 text-slate-900 border-b-2 border-slate-200">
      {/* Skill Labels Row (Criterion Only) */}
      {isCriterion && !isSingleMode && (
        <tr className="bg-slate-950 text-white h-8 md:h-10">
          <th colSpan={colSpanCount} className="sticky left-0 z-50 bg-slate-950 border-r border-white/10"></th>
          {CRITERION_SKILLS.map(skill => (
            <th key={skill} colSpan={2} className="px-1 py-1 font-black uppercase text-[7px] md:text-[8px] tracking-widest border-r border-white/10 text-center text-sky-400">
              {skill.charAt(0)}
            </th>
          ))}
          <th className="bg-slate-900"></th>
        </tr>
      )}

      <tr className="h-12 md:h-16">
        <th className="w-8 md:w-14 min-w-[2rem] md:min-w-[3.5rem] p-1 md:p-4 font-black uppercase text-[8px] md:text-[10px] border-r border-slate-200 sticky left-0 z-40 bg-slate-50">SN</th>
        <th className="w-40 md:w-72 min-w-[10rem] md:min-w-[18rem] p-1.5 md:p-4 font-black text-left uppercase text-[8px] md:text-[10px] border-r border-slate-200 sticky left-8 md:left-14 z-40 bg-slate-50 shadow-[2px_0_4px_rgba(0,0,0,0.02)]">Name of Pupil</th>
        
        {showBookStatus && (
          <th className="w-16 md:w-32 min-w-[4rem] md:min-w-[8rem] p-1 md:p-4 font-black text-center uppercase text-[8px] md:text-[10px] border-r border-slate-200 sticky left-[12rem] md:left-[21.5rem] z-40 bg-slate-50 shadow-[2px_0_4px_rgba(0,0,0,0.02)]">Status</th>
        )}

        {exerciseNumbers.map((num) => {
          const isPost = isCriterion && num % 2 === 0;
          return (
            <th 
              key={num} 
              onClick={() => toggleFocus(num)}
              className={`p-1 md:p-4 font-black text-center uppercase text-[8px] md:text-[10px] border-r border-slate-200 transition-all ${isExporting ? '' : 'cursor-pointer hover:bg-slate-200'} ${isSingleMode ? 'bg-indigo-600 text-white' : ''} min-w-[3rem] md:min-w-[5rem]`}
            >
              {isCriterion ? (isPost ? 'Post' : 'Pre') : `E${num}`}
            </th>
          );
        })}
        {showTotal && <th className="w-12 md:w-24 p-1 md:p-4 font-black uppercase text-center text-[8px] md:text-[10px] bg-slate-200">{isCriterion ? 'Gr' : 'Σ'}</th>}
      </tr>

      {/* DATE ROW */}
      {!isCriterion && (
        <tr className="bg-white h-8 md:h-12 border-b border-slate-100">
          <th colSpan={colSpanCount} className="p-1 md:p-2 text-left px-2 md:px-8 font-black uppercase text-[7px] md:text-[9px] text-slate-900 border-r border-slate-200 sticky left-0 z-40 bg-white">
            <div className="flex items-center justify-between gap-1">
              <span>Date</span>
              {!isExporting && (
                <button onClick={() => onApplyAll('date')} className="no-print p-0.5 hover:bg-slate-100 rounded text-slate-300 hover:text-slate-900 transition-colors">
                  <svg className="w-2 h-2 md:w-2.5 md:h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 13l-7 7-7-7" /></svg>
                </button>
              )}
            </div>
          </th>
          {exerciseNumbers.map((num) => (
            <th key={num} className="p-0 border-r border-slate-100">
              {isExporting ? (
                <div className="text-[8px] font-black text-center">{data.exercises[num]?.date || '_ / _ / _'}</div>
              ) : (
                <input 
                  type="date" 
                  className="w-full h-full bg-transparent text-center text-[7px] md:text-[10px] font-black outline-none border-none opacity-60 focus:opacity-100" 
                  value={data.exercises[num]?.date || ''} 
                  onChange={(e) => onMetadataChange(num, 'date', e.target.value)} 
                />
              )}
            </th>
          ))}
          {showTotal && <th className="bg-slate-100"></th>}
        </tr>
      )}

      {/* FIVE INDICATOR ROWS */}
      {!isCriterion && [0, 1, 2, 3, 4].map((idx) => (
        <tr key={`indicator-row-${idx}`} className="bg-white h-6 md:h-10 border-b border-slate-100/50">
          <th colSpan={colSpanCount} className="p-0.5 md:p-1 text-left px-2 md:px-8 font-black uppercase text-[6px] md:text-[9px] text-slate-400 border-r border-slate-200 sticky left-0 z-40 bg-white">
            <div className="flex items-center justify-between gap-1">
              <span>Ind {idx + 1}</span>
              {idx === 0 && !isExporting && (
                <button onClick={() => onApplyAll('indicatorCodes')} className="no-print p-0.5 hover:bg-slate-100 rounded text-slate-200 hover:text-slate-900 transition-colors">
                  <svg className="w-2 h-2 md:w-2.5 md:h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 13l-7 7-7-7" /></svg>
                </button>
              )}
            </div>
          </th>
          {exerciseNumbers.map((num) => (
            <th key={num} className="p-0 border-r border-slate-100">
              {isExporting ? (
                <div className="text-[7px] font-black text-center text-indigo-600">{(data.exercises[num]?.indicatorCodes || [])[idx] || '-'}</div>
              ) : (
                <select 
                  className="w-full h-full bg-transparent text-center text-[7px] md:text-[9px] font-black text-indigo-600 outline-none border-none cursor-pointer appearance-none hover:bg-indigo-50/30 transition-colors" 
                  value={(data.exercises[num]?.indicatorCodes || [])[idx] || ''} 
                  onChange={(e) => handleIndicatorChange(num, idx, e.target.value)} 
                >
                  <option value="">-</option>
                  {availableIndicators.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                </select>
              )}
            </th>
          ))}
          {showTotal && <th className="bg-slate-50/50"></th>}
        </tr>
      ))}

      {/* THRESHOLD ROW */}
      <tr className="bg-yellow-400 text-slate-950 h-10 md:h-14">
        <th colSpan={colSpanCount} className="p-1 md:p-2 text-left px-2 md:px-8 font-black uppercase text-[7px] md:text-[10px] tracking-tighter border-r border-black/5 sticky left-0 z-40 bg-yellow-400">
           <div className="flex items-center justify-between gap-1">
            <span className="hidden sm:inline">Max Score</span>
            <span className="sm:hidden">Max</span>
            {!isExporting && (
              <button onClick={() => onApplyAll('maxScore')} className="p-0.5 hover:bg-black/5 rounded text-slate-600 hover:text-black transition-colors">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 13l-7 7-7-7" /></svg>
              </button>
            )}
          </div>
        </th>
        {exerciseNumbers.map((num) => (
          <th key={num} className="p-0 border-r border-black/5 relative group">
            <div className="flex items-center justify-center h-full relative group">
              {!isExporting && (
                <button 
                  onClick={() => adjustMaxScore(num, -1)}
                  className="absolute left-0.5 w-5 h-5 md:w-7 md:h-7 flex items-center justify-center bg-black/10 text-slate-950 rounded-md md:rounded-lg hover:bg-rose-500 hover:text-white active:scale-90 transition-all text-[10px] font-black"
                >-</button>
              )}

              <div className="w-full text-center text-[10px] md:text-base font-black text-slate-950">
                {data.exercises[num]?.maxScore || '10'}
              </div>

              {!isExporting && (
                <button 
                  onClick={() => adjustMaxScore(num, 1)}
                  className="absolute right-0.5 w-5 h-5 md:w-7 md:h-7 flex items-center justify-center bg-black/10 text-slate-950 rounded-md md:rounded-lg hover:bg-emerald-500 hover:text-white active:scale-90 transition-all text-[10px] font-black"
                >+</button>
              )}
            </div>
          </th>
        ))}
        {showTotal && <th className="text-center font-black text-[8px] md:text-[10px] uppercase tracking-tighter text-slate-950">{isExporting ? '' : '+/-'}</th>}
      </tr>
    </thead>
  );
};

export default AssessmentHeader;