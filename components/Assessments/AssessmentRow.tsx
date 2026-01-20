import React from 'react';
import { Pupil, ExerciseMetadata, AssessmentType } from '../../types';

interface Props {
  index: number;
  pupil: Pupil;
  exerciseNumbers: number[];
  exercisesMetadata: Record<number, ExerciseMetadata>;
  availableIndicators: string[];
  onUpdatePupil: (pupilId: string, updates: Partial<Pupil>) => void;
  onInterventionClick: (pupil: Pupil) => void;
  showTotal: boolean;
  type: AssessmentType;
  isExporting?: boolean;
}

const AssessmentRow: React.FC<Props> = ({ index, pupil, exerciseNumbers, exercisesMetadata, availableIndicators, onUpdatePupil, onInterventionClick, showTotal, type, isExporting = false }) => {
  const isBookMissing = pupil.bookOpen === false;
  const isSingleMode = exerciseNumbers.length === 1;
  const isCriterion = type === 'CRITERION';
  const showBookStatus = !isSingleMode && !isCriterion;

  const calculateResult = () => {
    if (!isCriterion) {
      return (Object.values(pupil.scores) as string[]).reduce((acc, s) => acc + (parseFloat(s) || 0), 0);
    }
    let totalGrowth = 0;
    let pairsCount = 0;
    for (let i = 1; i <= 12; i += 2) {
      const pre = parseFloat(pupil.scores[i] || '');
      const post = parseFloat(pupil.scores[i+1] || '');
      if (!isNaN(pre) && !isNaN(post)) {
        totalGrowth += (post - pre);
        pairsCount++;
      }
    }
    return pairsCount > 0 ? totalGrowth : null;
  };

  const result = calculateResult();

  const handleScoreChange = (exId: number, value: string) => {
    if (isBookMissing && !isCriterion) return; 
    const max = parseFloat(exercisesMetadata[exId]?.maxScore || '100') || 100;
    let finalValue = value;
    const num = parseFloat(value);
    if (!isNaN(num)) {
      if (num < 0) finalValue = '0';
      if (num > max) finalValue = max.toString();
    }
    onUpdatePupil(pupil.id, { scores: { ...pupil.scores, [exId]: finalValue } });
  };

  const adjustScore = (exId: number, delta: number) => {
    if (isBookMissing && !isCriterion) return;
    const current = parseFloat(pupil.scores[exId] || '0') || 0;
    handleScoreChange(exId, (current + delta).toString());
  };

  return (
    <tr className={`h-16 transition-all duration-300 ${isBookMissing && !isCriterion ? 'bg-slate-50 grayscale-[0.8] opacity-60' : 'hover:bg-indigo-50/30'}`}>
      <td className="sticky left-0 z-20 bg-white border-r border-slate-200 text-center font-black text-[10px] md:text-[11px] text-slate-300">
        {index + 1}
      </td>
      <td className="sticky left-12 md:left-14 z-20 bg-white border-r border-slate-200 p-0 shadow-[4px_0_10px_rgba(0,0,0,0.02)]">
         <div className="flex items-center h-full gap-2 md:gap-3 px-3 md:px-5 group">
            {isExporting ? (
              <div className="font-black uppercase text-[10px] md:text-[11px] text-slate-900 truncate">{pupil.name}</div>
            ) : (
              <input 
                className="flex-1 h-full bg-transparent font-black uppercase text-[10px] md:text-[11px] outline-none text-slate-900 truncate" 
                value={pupil.name} 
                onChange={(e) => onUpdatePupil(pupil.id, { name: e.target.value.toUpperCase() })} 
                placeholder="NAME..." 
              />
            )}
            {!isCriterion && !isExporting && (
              <button onClick={() => onInterventionClick(pupil)} className="p-2 bg-rose-50 text-rose-500 rounded-xl transition-all hover:bg-rose-600 hover:text-white shadow-sm shrink-0 no-print">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 16a2 2 0 11-4 0h4z"/></svg>
              </button>
            )}
         </div>
      </td>
      
      {showBookStatus && (
        <td className="sticky left-[17rem] md:left-[21.5rem] z-20 bg-white border-r border-slate-200 p-0 shadow-[4px_0_10px_rgba(0,0,0,0.02)] text-center">
           <button 
             onClick={() => onUpdatePupil(pupil.id, { bookOpen: !pupil.bookOpen })}
             className={`w-full h-full text-[9px] font-black uppercase transition-all ${isBookMissing ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50/10'}`}
           >
             {isBookMissing ? 'Missen' : 'Prst'}
           </button>
        </td>
      )}

      {exerciseNumbers.map(num => {
        const score = pupil.scores[num];
        const max = parseFloat(exercisesMetadata[num]?.maxScore || '100') || 100;
        const val = parseFloat(score || '');
        const isPoor = !isNaN(val) && val < (max / 2);

        return (
          <td key={num} className={`p-0 border-r border-slate-100 group relative transition-all ${isPoor ? 'bg-rose-50/30' : ''}`}>
            <div className="flex items-center justify-center h-full relative p-1.5">
              {!isExporting && (
                <button 
                  onClick={() => adjustScore(num, -1)}
                  className="absolute left-1 w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-400 rounded-lg hover:bg-rose-500 hover:text-white transition-all shadow-sm z-10 font-black no-print opacity-0 group-hover:opacity-100"
                  disabled={isBookMissing && !isCriterion}
                >-</button>
              )}

              <input 
                className={`w-full bg-transparent text-center font-black text-xs md:text-sm outline-none border-none ${isPoor ? 'text-rose-600' : 'text-slate-900'} ${isBookMissing && !isCriterion ? 'opacity-30' : ''}`}
                value={score || ''}
                onChange={(e) => handleScoreChange(num, e.target.value)}
                readOnly={isBookMissing && !isCriterion}
                placeholder="-"
              />

              {!isExporting && (
                <button 
                  onClick={() => adjustScore(num, 1)}
                  className="absolute right-1 w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-400 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm z-10 font-black no-print opacity-0 group-hover:opacity-100"
                  disabled={isBookMissing && !isCriterion}
                >+</button>
              )}
            </div>
          </td>
        );
      })}
      {showTotal && (
        <td className={`text-center font-black text-xs md:text-sm bg-slate-50 ${isCriterion ? (result && result > 0 ? 'text-emerald-600' : result && result < 0 ? 'text-rose-600' : 'text-slate-400') : 'text-slate-950'}`}>
          {result !== null ? (isCriterion && result > 0 ? `+${result}` : result) : '0'}
        </td>
      )}
    </tr>
  );
};

export default AssessmentRow;