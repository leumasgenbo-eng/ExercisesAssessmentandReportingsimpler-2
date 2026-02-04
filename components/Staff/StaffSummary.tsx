import React, { useMemo, useState } from 'react';
import { ManagementState, AppState, AssessmentData, ExerciseMetadata } from '../../types';
import { WEEK_COUNT } from '../../constants';

interface Props {
  data: ManagementState;
  fullAppState?: AppState;
}

interface IndicatorDetail {
  label: string;
  formula: string;
  value: number;
  interpretation: string;
  utilization: string;
  category: 'LEARNER' | 'FACILITATOR';
  color: string;
}

const StaffSummary: React.FC<Props> = ({ data, fullAppState }) => {
  const [activeTab, setActiveTab] = useState<'OVERALL' | 'LEARNER' | 'FACILITATOR'>('OVERALL');

  const processedMetrics = useMemo(() => {
    if (!fullAppState || !data) return null;

    let totalTasksGiven = 0;
    let totalTasksCompleted = 0;
    let totalPossibleMarks = 0;
    let totalObtainedMarks = 0;
    let presentationCriteriaMet = 0;
    let totalPresentationAttempts = 0;
    let lessonsWithRecordedWork = new Set<string>();
    let totalExpectedLessons = WEEK_COUNT * 5; 
    let applicationMarksObtained = 0;
    let totalApplicationMarksPossible = 0;
    let instructionCompliantTasks = 0;
    let totalTasksAssessed = 0;
    
    let expectedAssignments = (data.weeklyMappings || []).reduce((acc, curr) => 
      acc + (curr.classWorkCount + curr.homeWorkCount + curr.projectWorkCount), 0) || 1;
    let tasksWithConstructiveFeedback = 0;
    let tasksMarkedAndCorrected = 0;
    let tasksAlignedToSyllabus = 0;

    (['classWork', 'homeWork', 'projectWork'] as const).forEach(cat => {
      const workMap = fullAppState[cat] || {};
      const category = cat === 'classWork' ? 'CLASS' : cat === 'homeWork' ? 'HOME' : 'PROJECT';
      
      Object.entries(workMap).forEach(([key, assessmentVal]) => {
        const assessment = assessmentVal as AssessmentData;
        if (!assessment) return;
        
        const keyParts = key.split('|');
        const wk = keyParts[0] || '1';
        const sub = keyParts[2] || 'GENERAL';
        lessonsWithRecordedWork.add(`${wk}-${sub}`);

        const exercises = assessment.exercises || {};
        Object.values(exercises).forEach(ex => {
          totalTasksGiven++;
          const max = parseFloat(ex.maxScore) || 100;
          if (ex.indicatorCodes && ex.indicatorCodes.length > 0) tasksAlignedToSyllabus++;
          
          const pupils = assessment.pupils || [];
          pupils.forEach(pupil => {
            const score = parseFloat(pupil.scores?.[ex.id] || '');
            totalTasksAssessed++;
            
            if (!isNaN(score)) {
              totalTasksCompleted++;
              totalObtainedMarks += score;
              totalPossibleMarks += max;

              if (cat === 'projectWork' || score > (max * 0.85)) {
                applicationMarksObtained += score;
                totalApplicationMarksPossible += max;
              }

              const corr = pupil.correctionStatus?.[ex.id];
              totalPresentationAttempts++;
              if (corr?.done && corr?.marked) {
                presentationCriteriaMet++;
                tasksMarkedAndCorrected++;
              }

              if (pupil.interventions && pupil.interventions.length > 0) {
                tasksWithConstructiveFeedback++;
              }
              
              if (score >= (max * 0.5)) instructionCompliantTasks++;
            }
          });
        });
      });
    });

    const staffListLength = data.staff?.length || 1;

    const indicators: IndicatorDetail[] = [
      {
        label: "Completion Rate",
        category: "LEARNER",
        formula: "(Tasks Completed / Tasks Given) × 100",
        value: (totalTasksCompleted / Math.max(1, totalTasksGiven * (staffListLength * 20))) * 100,
        interpretation: "Quantifies learner engagement and the efficacy of task distribution.",
        utilization: "Low rates indicate task fatigue or chronic absenteeism.",
        color: "indigo"
      },
      {
        label: "Accuracy Score",
        category: "LEARNER",
        formula: "(Correct Responses / Total Responses) × 100",
        value: (totalObtainedMarks / Math.max(1, totalPossibleMarks)) * 100,
        interpretation: "The direct measure of instructional absorption.",
        utilization: "Scores < 60% trigger immediate 'Reteach' cycles.",
        color: "emerald"
      },
      {
        label: "Presentation Score",
        category: "LEARNER",
        formula: "(Criteria Met / Total Criteria) × 100",
        value: (presentationCriteriaMet / Math.max(1, totalPresentationAttempts)) * 100,
        interpretation: "Tracks adherence to neatness and formal standards.",
        utilization: "Identifies pupils requiring fine-motor support.",
        color: "amber"
      },
      {
        label: "Consistency Index",
        category: "LEARNER",
        formula: "(Lessons with Work / Total Lessons) × 100",
        value: (lessonsWithRecordedWork.size / Math.max(1, totalExpectedLessons)) * 100,
        interpretation: "Measures the regularity of academic output.",
        utilization: "Low consistency reveals 'Blackout Weeks'.",
        color: "sky"
      },
      {
        label: "Application Score",
        category: "LEARNER",
        formula: "(Application Marks / Total Possible) × 100",
        value: (applicationMarksObtained / Math.max(1, totalApplicationMarksPossible)) * 100,
        interpretation: "Assesses higher-order thinking (Bloom's Levels).",
        utilization: "Rote learning detection index.",
        color: "rose"
      },
      {
        label: "Instruction Compliance",
        category: "LEARNER",
        formula: "(Correctly Done Tasks / Total Assessed) × 100",
        value: (instructionCompliantTasks / Math.max(1, totalTasksAssessed)) * 100,
        interpretation: "Measures the ability of learners to follow directives.",
        utilization: "A deficit signals poor classroom management.",
        color: "violet"
      },
      {
        label: "Assignment Frequency",
        category: "FACILITATOR",
        formula: "(Assignments Given / Expected Number) × 100",
        value: (totalTasksGiven / Math.max(1, expectedAssignments)) * 100,
        interpretation: "Monitors facilitator output against roadmap.",
        utilization: "Benchmark for staff appraisals.",
        color: "slate"
      },
      {
        label: "Feedback Quality",
        category: "FACILITATOR",
        formula: "(Tasks with Feedback / Total Checked) × 100",
        value: (tasksWithConstructiveFeedback / Math.max(1, totalTasksCompleted)) * 100,
        interpretation: "Ratio of tasks receiving diagnostic markers.",
        utilization: "Critical for student growth.",
        color: "blue"
      },
      {
        label: "Marking Rate",
        category: "FACILITATOR",
        formula: "(Tasks Marked & Corrected / Total Submitted) × 100",
        value: (tasksMarkedAndCorrected / Math.max(1, totalTasksCompleted)) * 100,
        interpretation: "Evidence of facilitator follow-up.",
        utilization: "High marking rates correlate with faster recovery.",
        color: "teal"
      },
      {
        label: "Alignment Score",
        category: "FACILITATOR",
        formula: "(Tasks Aligned to Syllabus / Total Reviewed) × 100",
        value: (tasksAlignedToSyllabus / Math.max(1, totalTasksGiven)) * 100,
        interpretation: "Ensures assessments measure NaCCA objectives.",
        utilization: "Protects during external inspections.",
        color: "fuchsia"
      }
    ];

    const overallScore = indicators.reduce((a, b) => a + b.value, 0) / indicators.length;

    return { indicators, overallScore };
  }, [fullAppState, data]);

  if (!processedMetrics) return <div className="p-20 text-center font-black text-slate-300 uppercase animate-pulse">Initializing Institutional Intelligence Hub...</div>;

  const filteredIndicators = activeTab === 'OVERALL' 
    ? processedMetrics.indicators 
    : processedMetrics.indicators.filter(i => i.category === activeTab);

  return (
    <div className="space-y-12 animate-in pb-24">
      <div className="bg-slate-950 rounded-[4rem] p-12 text-white shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] transition-transform duration-1000 group-hover:scale-150"></div>
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="text-center md:text-left">
               <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.6em] block mb-6">Consolidated Outcome Matrix</span>
               <h3 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
                 Overall <br/>
                 <span className="text-indigo-500">Assessment Score</span>
               </h3>
            </div>
            <div className="flex flex-col items-center">
               <div className="relative flex items-center justify-center">
                  <svg className="w-56 h-56 md:w-64 md:h-64 transform -rotate-90">
                     <circle cx="50%" cy="50%" r="42%" className="stroke-white/5 fill-transparent" strokeWidth="16" />
                     <circle 
                        cx="50%" cy="50%" r="42%" 
                        className="stroke-indigo-500 fill-transparent transition-all duration-1000" 
                        strokeWidth="16" 
                        strokeDasharray="100 100" 
                        strokeDashoffset={100 - processedMetrics.overallScore} 
                        strokeLinecap="round" 
                     />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                     <span className="text-6xl md:text-7xl font-black">{processedMetrics.overallScore.toFixed(1)}</span>
                     <span className="text-[10px] font-black uppercase text-indigo-400">Percentile (%)</span>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <div className="flex justify-center no-print">
         <div className="bg-white p-1.5 rounded-[2.5rem] border border-slate-200 shadow-2xl flex gap-1">
            {['OVERALL', 'LEARNER', 'FACILITATOR'].map(f => (
               <button 
                 key={f} 
                 onClick={() => setActiveTab(f as any)}
                 className={`px-12 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === f ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
               >
                 {f} Indicators
               </button>
            ))}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
         {filteredIndicators.map((ind) => (
            <div key={ind.label} className="bg-white rounded-[3.5rem] p-10 border border-slate-200 shadow-xl hover:shadow-2xl transition-all group flex flex-col justify-between">
               <div>
                  <div className="flex justify-between items-start mb-10">
                     <span className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${ind.category === 'LEARNER' ? 'text-indigo-600 border-indigo-100 bg-indigo-50' : 'text-slate-400 border-slate-100 bg-slate-50'}`}>{ind.category} BASED</span>
                     <div className={`w-3 h-3 rounded-full ${ind.value >= 75 ? 'bg-emerald-500' : ind.value >= 40 ? 'bg-amber-400' : 'bg-rose-500'} animate-pulse`}></div>
                  </div>
                  
                  <h4 className="text-2xl font-black text-slate-950 uppercase tracking-tighter mb-2 leading-none">{ind.label}</h4>
                  <div className="font-mono text-[9px] text-slate-400 uppercase italic mb-8 flex items-center gap-2">
                     <span className="text-xs">ƒ</span> {ind.formula}
                  </div>

                  <div className="flex items-end justify-between mb-3">
                     <span className="text-5xl font-black text-slate-950">{ind.value.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden mb-10">
                     <div className={`h-full transition-all duration-1000 ${ind.value >= 75 ? 'bg-emerald-500' : ind.value >= 40 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${ind.value}%` }}></div>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                     <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Interpretation</h5>
                     <p className="text-[10px] font-bold text-slate-600 uppercase leading-relaxed">{ind.interpretation}</p>
                  </div>
               </div>
            </div>
         ))}
      </div>
    </div>
  );
};

export default StaffSummary;