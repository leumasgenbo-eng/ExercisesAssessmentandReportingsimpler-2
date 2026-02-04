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
    if (!fullAppState || !data) return null;

    const allClasses = Object.values(SCHOOL_HIERARCHY).flatMap(g => g.classes);
    
    const classMetrics = allClasses.map(className => {
      let totalObtained = 0;
      let totalPossible = 0;
      const skillStats: Record<string, { pre: number[], post: number[] }> = {};
      CRITERION_SKILLS.forEach(s => skillStats[s] = { pre: [], post: [] });

      (['classWork', 'homeWork', 'projectWork'] as const).forEach(cat => {
        const catData = fullAppState[cat] || {};
        Object.entries(catData).forEach(([key, assessmentVal]) => {
          const assessment = assessmentVal as AssessmentData;
          if (assessment?.className !== className) return;
          const pupils = assessment.pupils || [];
          pupils.forEach(pupil => {
            const scores = pupil.scores || {};
            Object.entries(scores).forEach(([exId, scoreStr]) => {
              const val = parseFloat(scoreStr);
              const max = parseFloat(assessment.exercises?.[parseInt(exId)]?.maxScore || '10');
              if (!isNaN(val) && !isNaN(max) && max > 0) {
                totalObtained += val;
                totalPossible += max;
              }
            });
          });
        });
      });

      const criterionData = fullAppState.criterionWork || {};
      Object.entries(criterionData).forEach(([key, assessmentVal]) => {
        const assessment = assessmentVal as AssessmentData;
        if (assessment?.className !== className) return;
        const pupils = assessment.pupils || [];
        pupils.forEach(pupil => {
          const scores = pupil.scores || {};
          CRITERION_SKILLS.forEach((skillName, skillIdx) => {
            const preIdx = skillIdx * 2 + 1;
            const postIdx = skillIdx * 2 + 2;
            const pre = parseFloat(scores[preIdx] || '');
            const post = parseFloat(scores[postIdx] || '');
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

    const validMetrics = classMetrics.filter(m => m.mastery >= 0);
    if (validMetrics.length === 0) return classMetrics;

    const avgMastery = validMetrics.reduce((acc, c) => acc + c.mastery, 0) / validMetrics.length;
    const sdMastery = Math.sqrt(validMetrics.map(c => Math.pow(c.mastery - avgMastery, 2)).reduce((a, b) => a + b, 0) / validMetrics.length);

    return classMetrics.map(c => ({
      ...c,
      zScore: sdMastery > 0 ? (c.mastery - avgMastery) / sdMastery : 0
    }));
  }, [fullAppState, data]);

  const getInterpretation = (rci: number, effect: number, mastery: number) => {
    if (rci > 1.96 && effect > 0.8) return { label: "Transformative Growth", status: "EXCELLENT" };
    if (rci > 1.96) return { label: "Reliable Improvement", status: "GOOD" };
    if (rci < -1.96) return { label: "Significant Regression", status: "CRITICAL" };
    if (mastery < 40) return { label: "At-Risk Baseline", status: "WARNING" };
    return { label: "Stable Progression", status: "STABLE" };
  };

  if (!stats) return <div className="p-20 text-center font-black uppercase text-slate-300 animate-pulse">Computing Institutional Intelligence...</div>;

  return (
    <div className="space-y-12 animate-in pb-24">
      <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-2xl overflow-hidden">
        <div className="p-8 md:p-12 border-b border-slate-100 bg-slate-50/50 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
           <div>
              <h3 className="text-3xl font-black text-slate-950 uppercase tracking-tighter leading-none">Clinical Compliance Matrix</h3>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.map((row) => {
                const target = selectedSkill === 'ALL' 
                  ? { rci: row.rci, effectSize: row.effectSize, hasData: row.hasCriterionData } 
                  : (row.detailedSkills.find(s => s.name === selectedSkill) || { rci: 0, effectSize: 0, hasData: false });

                const inter = getInterpretation(target.rci, target.effectSize, row.mastery);
                
                return (
                  <tr key={row.className} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-10 py-8">
                      <div className="font-black text-slate-900 uppercase text-sm tracking-tight">{row.className}</div>
                    </td>
                    <td className="px-8 py-8 text-center">
                      <div className={`inline-block px-5 py-2 rounded-2xl font-black text-xs ${row.mastery >= 75 ? 'bg-emerald-50 text-emerald-600' : row.mastery < 40 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                        {row.mastery.toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-8 py-8 text-center font-black text-xs">
                      {target.hasData ? (target.rci > 0 ? `+${target.rci.toFixed(2)}` : target.rci.toFixed(2)) : '--'}
                    </td>
                    <td className="px-8 py-8 text-center">
                      <div className={`inline-block px-4 py-1.5 rounded-xl text-[11px] font-black`}>
                        {target.hasData ? target.effectSize.toFixed(2) : '--'}
                      </div>
                    </td>
                    <td className="px-8 py-8">
                       <span className={`text-[10px] font-black uppercase tracking-widest`}>
                         {target.hasData ? inter.label : 'NO DATA LOGGED'}
                       </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StaffCompliance;