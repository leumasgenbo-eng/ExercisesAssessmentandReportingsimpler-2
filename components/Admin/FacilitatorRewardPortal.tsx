import React, { useMemo, useState } from 'react';
import { ManagementState, AppState, AssessmentData, Staff, AssessmentType, ExerciseMetadata } from '../../types';
import { WEEK_COUNT } from '../../constants';

interface Props {
  data: ManagementState;
  fullState: AppState;
}

interface RewardMetrics {
  staffId: string;
  name: string;
  totalPoints: number;
  plansCompleted: number;
  assessmentsLogged: number;
  exercisesSubmitted: number;
  subjectCount: number;
  cashDividend: number;
  breakdown: {
    planPoints: number;
    assessmentPoints: number;
    exercisePoints: number;
    bonusPoints: number;
  };
}

// Point Configuration
const POINTS = {
  PLAN_FILLED: 15,
  ASSESSMENT_SUBMITTED: 10,
  EXERCISE_UNIT: 2,
  STREAK_BONUS: 50,
  COMPLETION_BONUS: 100
};

const FacilitatorRewardPortal: React.FC<Props> = ({ data, fullState }) => {
  const [selectedMonth, setSelectedMonth] = useState('MONTH 1');
  const [incentiveFund, setIncentiveFund] = useState<string>('');

  const leaderboard = useMemo(() => {
    const metricsMap = new Map<string, RewardMetrics>();

    // Initialize map with all staff
    data.staff.forEach(s => {
      metricsMap.set(s.id, {
        staffId: s.id,
        name: s.name,
        totalPoints: 0,
        plansCompleted: 0,
        assessmentsLogged: 0,
        exercisesSubmitted: 0,
        subjectCount: 0,
        cashDividend: 0,
        breakdown: { planPoints: 0, assessmentPoints: 0, exercisePoints: 0, bonusPoints: 0 }
      });
    });

    // 1. Process Planning Points
    data.weeklyMappings.forEach(wm => {
      const mapping = data.mappings.find(m => 
        m.className === wm.className && 
        data.subjects.find(s => s.id === m.subjectId)?.name === wm.subject
      );
      if (!mapping) return;

      const metric = metricsMap.get(mapping.staffId);
      if (!metric) return;

      if (wm.strand || wm.indicators) {
        metric.plansCompleted++;
        metric.breakdown.planPoints += POINTS.PLAN_FILLED;
      }
    });

    // 2. Process Assessment Points
    const workCategories: (keyof AppState)[] = ['classWork', 'homeWork', 'projectWork'];
    workCategories.forEach(cat => {
      const assessments = fullState[cat] as Record<string, AssessmentData>;
      Object.values(assessments).forEach(assessment => {
        const staff = data.staff.find(s => s.name === assessment.facilitator);
        if (!staff) return;

        const metric = metricsMap.get(staff.id);
        if (!metric) return;

        let validExercisesInDoc = 0;
        (Object.values(assessment.exercises) as ExerciseMetadata[]).forEach(ex => {
          if (ex.maxScore && ex.maxScore !== '') {
            validExercisesInDoc++;
            metric.exercisesSubmitted++;
            metric.breakdown.exercisePoints += POINTS.EXERCISE_UNIT;
          }
        });

        if (validExercisesInDoc > 0 || assessment.pupils.length > 0) {
          metric.assessmentsLogged++;
          metric.breakdown.assessmentPoints += POINTS.ASSESSMENT_SUBMITTED;
        }
      });
    });

    // Final Total Calculation + Bonuses
    let aggregateSchoolPoints = 0;
    metricsMap.forEach(m => {
      m.subjectCount = data.mappings.filter(map => map.staffId === m.staffId).length;
      
      // Calculate Bonuses
      if (m.plansCompleted >= (m.subjectCount * 4)) { // 4 weeks of full planning
        m.breakdown.bonusPoints += POINTS.STREAK_BONUS;
      }
      if (m.exercisesSubmitted >= (m.subjectCount * 12)) { // Avg 3 exercises per week
        m.breakdown.bonusPoints += POINTS.COMPLETION_BONUS;
      }

      m.totalPoints = m.breakdown.planPoints + m.breakdown.assessmentPoints + m.breakdown.exercisePoints + m.breakdown.bonusPoints;
      aggregateSchoolPoints += m.totalPoints;
    });

    // 3. Cash Distribution Logic
    const fundAmount = parseFloat(incentiveFund) || 0;
    if (fundAmount > 0 && aggregateSchoolPoints > 0) {
      metricsMap.forEach(m => {
        m.cashDividend = (m.totalPoints / aggregateSchoolPoints) * fundAmount;
      });
    }

    return Array.from(metricsMap.values()).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [data, fullState, incentiveFund]);

  const totalPointsPool = useMemo(() => 
    leaderboard.reduce((acc, curr) => acc + curr.totalPoints, 0),
  [leaderboard]);

  return (
    <div className="space-y-10">
      {/* HEADER SECTION */}
      <div className="bg-indigo-950 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
          <div>
            <span className="bg-indigo-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest mb-6 inline-block shadow-lg">Recognition Engine</span>
            <h3 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-4">Facilitator Merit <br/><span className="text-indigo-400">Point Matrix</span></h3>
            <p className="text-slate-400 text-sm max-w-lg font-bold uppercase tracking-widest leading-relaxed">System-generated rewards for academic excellence and logistical consistency.</p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem] backdrop-blur-md flex flex-col items-center min-w-[240px]">
               <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-4">Total Points Pool</div>
               <div className="text-4xl font-black text-white mb-2">{totalPointsPool}</div>
               <div className="text-[11px] font-bold text-slate-500 uppercase">Institutional Aggregate</div>
            </div>
            
            <div className="bg-indigo-600 p-8 rounded-[3rem] shadow-2xl flex flex-col items-center min-w-[240px] border border-indigo-400/30">
               <div className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-4">Active Champion</div>
               <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-3xl mb-4">🥇</div>
               <div className="text-lg font-black uppercase tracking-tight text-center truncate w-full">{leaderboard[0]?.name || '---'}</div>
               <div className="text-[11px] font-bold text-indigo-300 uppercase mt-1">{leaderboard[0]?.totalPoints || 0} POINTS</div>
            </div>
          </div>
        </div>
      </div>

      {/* MERIT EXPLANATION BLOCK */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl group hover:border-indigo-600 transition-all">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl mb-6 font-black">01</div>
            <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4">Curriculum Planning</h4>
            <p className="text-xs font-bold text-slate-400 uppercase leading-relaxed mb-6">Earn <span className="text-indigo-600">15 points</span> per week for every subject that has a defined Strand and set of Indicators in the Active Broadsheet.</p>
            <div className="flex justify-between items-center pt-6 border-t border-slate-50">
               <span className="text-[10px] font-black text-slate-300 uppercase">Value:</span>
               <span className="text-sm font-black text-indigo-600">+15 PTS</span>
            </div>
         </div>
         <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl group hover:border-emerald-600 transition-all">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-xl mb-6 font-black">02</div>
            <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4">Assessment Logging</h4>
            <p className="text-xs font-bold text-slate-400 uppercase leading-relaxed mb-6">Earn <span className="text-emerald-600">10 points</span> for every distinct sheet (CW, HW, or PW) that is successfully populated with student scores.</p>
            <div className="flex justify-between items-center pt-6 border-t border-slate-50">
               <span className="text-[10px] font-black text-slate-300 uppercase">Value:</span>
               <span className="text-sm font-black text-emerald-600">+10 PTS</span>
            </div>
         </div>
         <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl group hover:border-amber-600 transition-all">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-xl mb-6 font-black">03</div>
            <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4">Exercise Volume</h4>
            <p className="text-xs font-bold text-slate-400 uppercase leading-relaxed mb-6">Earn <span className="text-amber-600">2 points</span> for every individual exercise column within an assessment sheet. Higher volume = higher rewards.</p>
            <div className="flex justify-between items-center pt-6 border-t border-slate-50">
               <span className="text-[10px] font-black text-slate-300 uppercase">Value:</span>
               <span className="text-sm font-black text-amber-600">+2 PTS/UNIT</span>
            </div>
         </div>
      </div>

      {/* INCENTIVE DISTRIBUTION BOX */}
      <div className="bg-white rounded-[3rem] p-10 border-4 border-emerald-500 shadow-2xl no-print relative overflow-hidden">
        <div className="absolute right-0 top-0 p-10 opacity-5 grayscale pointer-events-none">
           <span className="text-9xl font-black">$$$</span>
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
           <div className="max-w-xl">
              <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2 flex items-center gap-3">
                 <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl">💰</span>
                 Incentive Share Explanation
              </h4>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-4">
                Enter a fund amount below. The system calculates your individual payout using the Proportional Equity formula:
              </p>
              <div className="bg-slate-900 p-4 rounded-2xl text-center">
                 <code className="text-emerald-400 font-mono text-xs uppercase font-black">Individual Payout = (Your Points / Total Pool) × Total Fund</code>
              </div>
           </div>
           
           <div className="w-full lg:w-96">
              <div className="relative group">
                 <div className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl">₵</div>
                 <input 
                   type="number" 
                   value={incentiveFund}
                   onChange={(e) => setIncentiveFund(e.target.value)}
                   className="w-full bg-slate-50 border-2 border-slate-100 p-8 pl-14 rounded-[2.5rem] text-4xl font-black text-slate-900 focus:border-emerald-500 outline-none transition-all shadow-inner placeholder-slate-200"
                   placeholder="0.00"
                 />
                 <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">Total Reward Fund</div>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEADERBOARD TABLE */}
        <div className="lg:col-span-12 bg-white rounded-[3.5rem] border border-slate-200 shadow-2xl overflow-hidden">
          <div className="p-8 md:p-12 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-6">
             <div>
                <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Academic Merit Board</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Live Rankings & Proportional Financial Allocation</p>
             </div>
             <div className="flex items-center gap-4">
                <select className="bg-white border-2 border-slate-100 px-6 py-2.5 rounded-xl font-black text-slate-900 text-[10px] uppercase outline-none focus:border-indigo-600" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                   {["MONTH 1", "MONTH 2", "MONTH 3", "MONTH 4"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
             </div>
          </div>

          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-10 py-7 text-[10px] font-black uppercase tracking-widest w-24 text-center">Rank</th>
                  <th className="px-10 py-7 text-[10px] font-black uppercase tracking-widest">Facilitator Identity</th>
                  <th className="px-8 py-7 text-[10px] font-black uppercase tracking-widest text-center">Merit Pts</th>
                  <th className="px-8 py-7 text-[10px] font-black uppercase tracking-widest text-center">Pool Weight</th>
                  <th className="px-10 py-7 text-[10px] font-black uppercase tracking-widest text-right bg-emerald-900/50">Cash Reward</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaderboard.map((row, idx) => {
                  const isGold = idx === 0;
                  const poolWeight = totalPointsPool > 0 ? (row.totalPoints / totalPointsPool) * 100 : 0;

                  return (
                    <tr key={row.staffId} className="hover:bg-indigo-50/20 transition-colors group">
                      <td className="px-10 py-8 text-center">
                         <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm mx-auto transition-all ${
                           isGold ? 'bg-amber-400 text-white shadow-lg scale-110' : 'bg-slate-100 text-slate-400'
                         }`}>
                           {idx + 1}
                         </div>
                      </td>
                      <td className="px-10 py-8">
                         <div className="font-black text-slate-900 uppercase text-sm tracking-tight group-hover:text-indigo-600 transition-colors">{row.name}</div>
                         <div className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{row.subjectCount} DUTY ASSIGNMENTS</div>
                      </td>
                      <td className="px-8 py-8 text-center">
                         <div className="inline-flex flex-col items-center">
                            <span className="text-xl font-black text-indigo-600">{row.totalPoints}</span>
                            <span className="text-[7px] font-black text-slate-300 uppercase">Points</span>
                         </div>
                      </td>
                      <td className="px-8 py-8 text-center">
                         <div className="text-xs font-black text-slate-600">{poolWeight.toFixed(1)}%</div>
                         <div className="w-16 h-1 bg-slate-100 rounded-full mx-auto mt-2 overflow-hidden">
                            <div className="h-full bg-indigo-400" style={{ width: `${poolWeight}%` }}></div>
                         </div>
                      </td>
                      <td className="px-10 py-8 text-right bg-emerald-50/20 group-hover:bg-emerald-50 transition-colors">
                         <div className="inline-flex flex-col items-end">
                            <span className="text-2xl font-black text-emerald-600">
                              ₵{row.cashDividend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Incentive Share</span>
                         </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacilitatorRewardPortal;