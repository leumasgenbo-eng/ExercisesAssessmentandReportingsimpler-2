
import React, { useMemo, useState } from 'react';
import { ManagementState, AppState, AssessmentData } from '../../types';
import { SCHOOL_HIERARCHY, CRITERION_SKILLS, WEEK_COUNT } from '../../constants';

interface Props {
  data: ManagementState;
  fullAppState?: AppState;
}

const StaffCompliance: React.FC<Props> = ({ data, fullAppState }) => {
  const [selectedSkill, setSelectedSkill] = useState<string>('ALL');

  const stats = useMemo(() => {
    if (!fullAppState) return null;

    const allClasses = Object.values(SCHOOL_HIERARCHY).flatMap(g => g.classes);
    
    const classMetrics = allClasses.map(className => {
      let totalObtained = 0;
      let totalPossible = 0;
      const skillStats: Record<string, { pre: number[], post: number[] }> = {};
      CRITERION_SKILLS.forEach(s => skillStats[s] = { pre: [], post: [] });

      (['classWork', 'homeWork', 'projectWork'] as const).forEach(cat => {
        Object.entries(fullAppState[cat]).forEach(([key, assessmentVal]) => {
          const assessment = assessmentVal as AssessmentData;
          if (assessment.className !== className) return;
          assessment.pupils.forEach(pupil => {
            Object.entries(pupil.scores).forEach(([exId, scoreStr]) => {
              const val = parseFloat(scoreStr);
              const max = parseFloat(assessment.exercises[parseInt(exId)]?.maxScore || '100');
              if (!isNaN(val) && !isNaN(max) && max > 0) {
                totalObtained += val;
                totalPossible += max;
              }
            });
          });
        });
      });

      Object.entries(fullAppState.criterionWork).forEach(([key, assessmentVal]) => {
        const assessment = assessmentVal as AssessmentData;
        if (assessment.className !== className) return;
        assessment.pupils.forEach(pupil => {
          CRITERION_SKILLS.forEach((skillName, skillIdx) => {
            const preIdx = skillIdx * 2 + 1;
            const postIdx = skillIdx * 2 + 2;
            const pre = parseFloat(pupil.scores[preIdx] || '');
            const post = parseFloat(pupil.scores[postIdx] || '');
            if (!isNaN(pre) && !isNaN(post)) {
              skillStats[skillName].pre.push(pre);
              skillStats[skillName].post.push(post);
            }
          });
        });
      });

      const getAnalytics = (pre: number[], post: number[]) => {
        if (pre.length === 0) return { rci: 0, effectSize: 0, hasData: false, meanPre: 0, meanPost: 0 };
        const meanPre = pre.reduce((a, b) => a + b, 0) / pre.length;
        const meanPost = post.reduce((a, b) => a + b, 0) / post.length;
        const getSD = (arr: number[], mean: number) => {
          if (arr.length < 2) return 0.5;
          return Math.sqrt(arr.map(v => Math.pow(v - mean, 2)).reduce((a, b) => a + b, 0) / (arr.length - 1));
        };
        const sdPre = getSD(pre, meanPre);
        const sdPost = getSD(post, meanPost);
        const sDiff = Math.sqrt(2 * Math.pow(sdPre, 2));
        const rci = sDiff > 0 ? (meanPost - meanPre) / sDiff : 0;
        const pooledSD = Math.sqrt((Math.pow(sdPre, 2) + Math.pow(sdPost, 2)) / 2);
        const effectSize = pooledSD > 0 ? (meanPost - meanPre) / pooledSD : 0;
        return { rci, effectSize, hasData: true, meanPre, meanPost };
      };

      const detailedSkills = CRITERION_SKILLS.map(name => ({
        name,
        ...getAnalytics(skillStats[name].pre, skillStats[name].post),
        sampleSize: skillStats[name].pre.length
      }));

      const allPre = detailedSkills.flatMap(s => skillStats[s.name].pre);
      const allPost = detailedSkills.flatMap(s => skillStats[s.name].post);
      const aggregateCriterion = getAnalytics(allPre, allPost);

      return {
        className,
        mastery: totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0,
        rci: aggregateCriterion.rci,
        effectSize: aggregateCriterion.effectSize,
        detailedSkills,
        hasCriterionData: aggregateCriterion.hasData
      };
    });

    const avgMastery = classMetrics.reduce((acc, c) => acc + c.mastery, 0) / classMetrics.length;
    const sdMastery = Math.sqrt(classMetrics.map(c => Math.pow(c.mastery - avgMastery, 2)).reduce((a, b) => a + b, 0) / classMetrics.length);

    return classMetrics.map(c => ({
      ...c,
      zScore: sdMastery > 0 ? (c.mastery - avgMastery) / sdMastery : 0
    }));
  }, [fullAppState]);

  const getInterpretation = (rci: number, effect: number, mastery: number) => {
    if (rci > 1.96 && effect > 0.8) return { label: "Transformative Growth", status: "EXCELLENT", action: "Scale this pedagogical model to other departments." };
    if (rci > 1.96) return { label: "Reliable Improvement", status: "GOOD", action: "Maintain current differentiation strategies." };
    if (rci < -1.96) return { label: "Significant Regression", status: "CRITICAL", action: "Urgent audit of facilitator delivery methods required." };
    if (mastery < 40) return { label: "At-Risk Baseline", status: "WARNING", action: "Deploy remedial clinical support immediately." };
    return { label: "Stable Progression", status: "STABLE", action: "Refine instructional materials for higher engagement." };
  };

  const getSkillStrategy = (skill: string) => {
    switch(skill) {
      case 'Reading Skill': return "Focus on phonological awareness and high-frequency word immersion.";
      case 'Handwriting': return "Incorporate fine-motor kinesthetic exercises and grip correction.";
      case 'Spelling': return "Utilize look-say-cover-write-check and phoneme mapping.";
      case 'Spatial Awareness': return "Introduce geometric puzzles and visual-spatial orientation tasks.";
      default: return "Review clinical indicators and adjust lesson pace.";
    }
  };

  if (!stats) return <div className="p-20 text-center font-black uppercase text-slate-300 animate-pulse">Computing Institutional Intelligence...</div>;

  return (
    <div className="space-y-12 animate-in pb-24">
      {/* ADVISORY CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-emerald-600 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20 text-6xl">🚀</div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Growth Leader</span>
          <div className="text-2xl font-black mt-2 uppercase">{stats.sort((a,b) => b.rci - a.rci)[0]?.className}</div>
          <p className="text-[11px] font-bold mt-4 leading-relaxed opacity-90">Showing transformative clinical growth in {selectedSkill === 'ALL' ? 'Aggregate' : selectedSkill}. Model their approach for school-wide improvement.</p>
        </div>
        <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20 text-6xl">⚖️</div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">School Median Mastery</span>
          <div className="text-4xl font-black mt-2">{(stats.reduce((a,b) => a + b.mastery, 0) / stats.length).toFixed(1)}%</div>
          <p className="text-[11px] font-bold mt-4 leading-relaxed opacity-90">The institutional performance floor. Targets should be set at +10% for the next cycle.</p>
        </div>
        <div className="bg-rose-600 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20 text-6xl">⚠️</div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Intervention Priority</span>
          <div className="text-2xl font-black mt-2 uppercase">{stats.sort((a,b) => a.rci - b.rci)[0]?.className}</div>
          <p className="text-[11px] font-bold mt-4 leading-relaxed opacity-90">Exhibiting reliable regression patterns. Requires immediate clinical observation and material revision.</p>
        </div>
      </div>

      {/* COMPLIANCE DESK */}
      <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-2xl overflow-hidden">
        <div className="p-8 md:p-12 border-b border-slate-100 bg-slate-50/50 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
           <div>
              <h3 className="text-3xl font-black text-slate-950 uppercase tracking-tighter leading-none">Clinical Compliance Matrix</h3>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.3em] mt-3">Statistical Evidence & Pedagogical Interpretation</p>
           </div>
           
           <div className="flex bg-white p-1.5 rounded-[1.5rem] border border-slate-200 shadow-sm no-print overflow-x-auto scrollbar-hide max-w-full">
              <button onClick={() => setSelectedSkill('ALL')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedSkill === 'ALL' ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>AGGREGATE</button>
              {CRITERION_SKILLS.map(skill => (
                <button key={skill} onClick={() => setSelectedSkill(skill)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedSkill === skill ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{skill.toUpperCase()}</button>
              ))}
           </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-950 text-white">
                <th className="px-10 py-7 text-[10px] font-black uppercase tracking-[0.2em] w-64">Class Context</th>
                <th className="px-8 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-center">Mastery (%)</th>
                <th className="px-8 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-center">RCI Index</th>
                <th className="px-8 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-center">Effect Size</th>
                <th className="px-8 py-7 text-[10px] font-black uppercase tracking-[0.2em]">Clinical Interpretation</th>
                <th className="px-10 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-right">Strategic Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.map((row) => {
                const target = selectedSkill === 'ALL' 
                  ? { rci: row.rci, effectSize: row.effectSize, hasData: row.hasCriterionData } 
                  : (row.detailedSkills.find(s => s.name === selectedSkill) || { rci: 0, effectSize: 0, hasData: false });

                const inter = getInterpretation(target.rci, target.effectSize, row.mastery);
                const isSig = Math.abs(target.rci) > 1.96;
                
                return (
                  <tr key={row.className} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-10 py-8">
                      <div className="font-black text-slate-900 uppercase text-sm tracking-tight">{row.className}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${row.zScore > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Z-SCORE: {row.zScore.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-8 py-8 text-center">
                      <div className={`inline-block px-5 py-2 rounded-2xl font-black text-xs ${row.mastery >= 75 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : row.mastery < 40 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-100 text-slate-600'}`}>
                        {row.mastery.toFixed(1)}%
                      </div>
                    </td>
                    <td className={`px-8 py-8 text-center font-black text-xs ${isSig ? (target.rci > 0 ? 'text-indigo-600' : 'text-rose-600 animate-pulse') : 'text-slate-300'}`}>
                      {target.hasData ? (target.rci > 0 ? `+${target.rci.toFixed(2)}` : target.rci.toFixed(2)) : '--'}
                    </td>
                    <td className="px-8 py-8 text-center">
                      <div className={`inline-block px-4 py-1.5 rounded-xl text-[11px] font-black ${target.effectSize >= 0.8 ? 'bg-indigo-900 text-white shadow-xl' : target.effectSize >= 0.5 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                        {target.hasData ? target.effectSize.toFixed(2) : '--'}
                      </div>
                    </td>
                    <td className="px-8 py-8">
                       <span className={`text-[10px] font-black uppercase tracking-widest ${inter.status === 'EXCELLENT' ? 'text-emerald-600' : inter.status === 'CRITICAL' ? 'text-rose-600' : 'text-slate-950'}`}>
                         {target.hasData ? inter.label : 'NO DATA LOGGED'}
                       </span>
                       <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Based on Clinical Thresholds</p>
                    </td>
                    <td className="px-10 py-8 text-right max-w-xs ml-auto">
                      <div className="text-[10px] font-bold text-slate-600 leading-relaxed uppercase tracking-tight italic">
                        {target.hasData ? (
                          <>
                            {inter.action}
                            <span className="block text-indigo-500 mt-1 not-italic font-black text-[8px]">{selectedSkill !== 'ALL' && getSkillStrategy(selectedSkill)}</span>
                          </>
                        ) : 'Pending assessment input...'}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-center opacity-30">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">© 2026 UNITED BAYLOR ACADEMY • Monitoring Frequency: 3x • v4.5 Digital Brain</p>
      </div>
    </div>
  );
};

export default StaffCompliance;
