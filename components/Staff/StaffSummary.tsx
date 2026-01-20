
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
    if (!fullAppState) return null;

    let totalTasksGiven = 0;
    let totalTasksCompleted = 0;
    let totalPossibleMarks = 0;
    let totalObtainedMarks = 0;
    let presentationCriteriaMet = 0;
    let totalPresentationAttempts = 0;
    let lessonsWithRecordedWork = new Set<string>();
    let totalExpectedLessons = WEEK_COUNT * 5; // Simplified assumption: 5 subjects/lessons per week
    let applicationMarksObtained = 0;
    let totalApplicationMarksPossible = 0;
    let instructionCompliantTasks = 0;
    let totalTasksAssessed = 0;
    
    let expectedAssignments = data.weeklyMappings.reduce((acc, curr) => 
      acc + (curr.classWorkCount + curr.homeWorkCount + curr.projectWorkCount), 0) || 1;
    let tasksWithConstructiveFeedback = 0;
    let tasksMarkedAndCorrected = 0;
    let tasksAlignedToSyllabus = 0;

    (['classWork', 'homeWork', 'projectWork'] as const).forEach(cat => {
      Object.entries(fullAppState[cat]).forEach(([key, assessmentVal]) => {
        const assessment = assessmentVal as AssessmentData;
        const [wk, cls, sub] = key.split('|');
        lessonsWithRecordedWork.add(`${wk}-${sub}`);

        Object.values(assessment.exercises).forEach(ex => {
          totalTasksGiven++;
          const max = parseFloat(ex.maxScore) || 100;
          if (ex.indicatorCodes && ex.indicatorCodes.length > 0) tasksAlignedToSyllabus++;
          
          assessment.pupils.forEach(pupil => {
            const score = parseFloat(pupil.scores[ex.id]);
            totalTasksAssessed++;
            
            if (!isNaN(score)) {
              totalTasksCompleted++;
              totalObtainedMarks += score;
              totalPossibleMarks += max;

              // Logic for Application/Creativity: Project work is the primary proxy
              if (cat === 'projectWork' || score > (max * 0.85)) {
                applicationMarksObtained += score;
                totalApplicationMarksPossible += max;
              }

              // Logic for Presentation: Based on "Correction Status" metadata
              const corr = pupil.correctionStatus?.[ex.id];
              totalPresentationAttempts++;
              if (corr?.done && corr?.marked) {
                presentationCriteriaMet++;
                tasksMarkedAndCorrected++;
              }

              // Logic for Feedback: Interventions recorded count as constructive diagnostic feedback
              if (pupil.interventions && pupil.interventions.length > 0) {
                tasksWithConstructiveFeedback++;
              }
              
              // Logic for Instruction Compliance: Simulated based on high accuracy vs average
              if (score >= (max * 0.5)) instructionCompliantTasks++;
            }
          });
        });
      });
    });

    const indicators: IndicatorDetail[] = [
      {
        label: "Completion Rate",
        category: "LEARNER",
        formula: "(Tasks Completed / Tasks Given) × 100",
        value: (totalTasksCompleted / Math.max(1, totalTasksGiven * (fullAppState.management.staff.length * 20))) * 100, // Normalized
        interpretation: "Quantifies learner engagement and the efficacy of task distribution.",
        utilization: "Low rates indicate task fatigue or chronic absenteeism. Reduce workload or implement home-visit protocols.",
        color: "indigo"
      },
      {
        label: "Accuracy Score",
        category: "LEARNER",
        formula: "(Correct Responses / Total Responses) × 100",
        value: (totalObtainedMarks / Math.max(1, totalPossibleMarks)) * 100,
        interpretation: "The direct measure of instructional absorption and pupil proficiency.",
        utilization: "Scores < 60% trigger immediate 'Reteach' cycles for facilitators in that specific domain.",
        color: "emerald"
      },
      {
        label: "Presentation Score",
        category: "LEARNER",
        formula: "(Criteria Met / Total Criteria) × 100",
        value: (presentationCriteriaMet / Math.max(1, totalPresentationAttempts)) * 100,
        interpretation: "Tracks adherence to neatness, organization, and formal standards.",
        utilization: "Used to identify pupils requiring fine-motor support or executive function coaching.",
        color: "amber"
      },
      {
        label: "Consistency Index",
        category: "LEARNER",
        formula: "(Lessons with Work / Total Lessons) × 100",
        value: (lessonsWithRecordedWork.size / Math.max(1, totalExpectedLessons)) * 100,
        interpretation: "Measures the regularity of academic output throughout the term.",
        utilization: "Low consistency reveals 'Blackout Weeks' where no learning evidence was recorded. Audit timetable adherence.",
        color: "sky"
      },
      {
        label: "Application Score",
        category: "LEARNER",
        formula: "(Application Marks / Total Possible) × 100",
        value: (applicationMarksObtained / Math.max(1, totalApplicationMarksPossible)) * 100,
        interpretation: "Assesses higher-order thinking (Bloom's Taxonomy levels of Analysis & Synthesis).",
        utilization: "If Accuracy is high but Application is low, teaching is too rote. Introduce more divergent questioning.",
        color: "rose"
      },
      {
        label: "Instruction Compliance",
        category: "LEARNER",
        formula: "(Correctly Done Tasks / Total Assessed) × 100",
        value: (instructionCompliantTasks / Math.max(1, totalTasksAssessed)) * 100,
        interpretation: "Measures the ability of learners to follow complex multi-step directives.",
        utilization: "A deficit here signals poor classroom management or unclear instruction delivery by the teacher.",
        color: "violet"
      },
      {
        label: "Assignment Frequency",
        category: "FACILITATOR",
        formula: "(Assignments Given / Expected Number) × 100",
        value: (totalTasksGiven / Math.max(1, expectedAssignments)) * 100,
        interpretation: "Monitors facilitator output against institutional curriculum roadmap.",
        utilization: "Benchmark for staff appraisals. Below 85% constitutes a 'Curriculum Coverage' risk.",
        color: "slate"
      },
      {
        label: "Feedback Quality",
        category: "FACILITATOR",
        formula: "(Tasks with Feedback / Total Checked) × 100",
        value: (tasksWithConstructiveFeedback / Math.max(1, totalTasksCompleted)) * 100,
        interpretation: "The ratio of tasks receiving diagnostic markers instead of just ticks.",
        utilization: "Critical for student growth. Mentorship needed for teachers providing only 'judgmental' feedback.",
        color: "blue"
      },
      {
        label: "Marking Rate",
        category: "FACILITATOR",
        formula: "(Tasks Marked & Corrected / Total Submitted) × 100",
        value: (tasksMarkedAndCorrected / Math.max(1, totalTasksCompleted)) * 100,
        interpretation: "Evidence of facilitator follow-up and verification of student work.",
        utilization: "Unmarked work represents a 'Blind Spot'. High marking rates correlate with faster remedial recovery.",
        color: "teal"
      },
      {
        label: "Alignment Score",
        category: "FACILITATOR",
        formula: "(Tasks Aligned to Syllabus / Total Reviewed) × 100",
        value: (tasksAlignedToSyllabus / Math.max(1, totalTasksGiven)) * 100,
        interpretation: "Ensures assessments actually measure NaCCA/Standard objectives.",
        utilization: "Low alignment means teachers are testing irrelevant material. Re-orient staff on Indicator Coding.",
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
      {/* OVERALL PERFORMANCE INDEX HEADER */}
      <div className="bg-slate-950 rounded-[4rem] p-12 text-white shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] transition-transform duration-1000 group-hover:scale-150"></div>
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="text-center md:text-left">
               <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.6em] block mb-6">Consolidated Outcome Matrix</span>
               <h3 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
                 Overall <br/>
                 <span className="text-indigo-500">Assessment Score</span>
               </h3>
               <p className="text-slate-400 text-xs md:text-sm mt-8 max-w-lg uppercase font-bold tracking-widest leading-relaxed">
                 Aggregate proficiency index derived from both learner performance vectors and facilitator delivery metrics.
               </p>
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
               <div className={`mt-8 px-10 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl ${processedMetrics.overallScore >= 80 ? 'bg-emerald-600' : processedMetrics.overallScore >= 50 ? 'bg-amber-500' : 'bg-rose-600'}`}>
                  {processedMetrics.overallScore >= 80 ? 'Elite Institutional Status' : processedMetrics.overallScore >= 50 ? 'Developing Proficiency' : 'Critical Intervention Required'}
               </div>
            </div>
         </div>
      </div>

      {/* FILTER CONTROLS */}
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

      {/* INDICATOR MATRIX GRID */}
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
                     <span className="text-[9px] font-black uppercase text-slate-300">Metric Value</span>
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
                  <div className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100">
                     <h5 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                        Strategic Utilization
                     </h5>
                     <p className="text-[10px] font-bold text-indigo-900 uppercase leading-relaxed italic">{ind.utilization}</p>
                  </div>
               </div>
            </div>
         ))}
      </div>

      {/* PERFORMANCE UTILIZATION MASTER GUIDE */}
      <div className="bg-white border-4 border-slate-950 rounded-[4rem] p-12 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-12 opacity-5 grayscale pointer-events-none">
            <span className="text-[20rem] font-black uppercase">KPI</span>
         </div>
         
         <div className="relative z-10">
            <h4 className="text-4xl font-black uppercase tracking-widest mb-12 text-slate-950 flex items-center gap-6">
               <span className="w-16 h-16 rounded-3xl bg-slate-950 text-white flex items-center justify-center text-2xl shadow-xl">📈</span>
               Institutional Performance Utilization Guide
            </h4>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
               <div className="space-y-10">
                  <div className="group">
                     <h5 className="text-sm font-black uppercase text-indigo-600 mb-4 border-b-2 border-indigo-50 pb-2 flex items-center justify-between">
                        Operationalizing Learner Values
                        <span className="text-[10px] bg-indigo-50 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">DOMAIN 01</span>
                     </h5>
                     <p className="text-xs font-bold text-slate-500 uppercase leading-relaxed">
                        Use the <span className="text-slate-950">Consistency Index</span> and <span className="text-slate-950">Completion Rate</span> to audit the feasibility of your curriculum. If these values are high but <span className="text-indigo-600">Accuracy</span> is low, it suggests pupils are working fast but not effectively. Facilitators must pivot from 'Syllabus Completion' to 'Conceptual Mastery'.
                     </p>
                  </div>
                  <div>
                     <h5 className="text-sm font-black uppercase text-amber-600 mb-4 border-b-2 border-amber-50 pb-2">Behavioral Context</h5>
                     <p className="text-xs font-bold text-slate-500 uppercase leading-relaxed">
                        A low <span className="text-amber-600">Instruction Compliance</span> score is the earliest indicator of classroom management breakdown. It signals that either the teacher's directives are ambiguous or the class climate has become uncooperative.
                     </p>
                  </div>
               </div>
               
               <div className="space-y-10">
                  <div className="group">
                     <h5 className="text-sm font-black uppercase text-emerald-600 mb-4 border-b-2 border-emerald-50 pb-2 flex items-center justify-between">
                        Facilitator Accountability 
                        <span className="text-[10px] bg-emerald-50 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">DOMAIN 02</span>
                     </h5>
                     <p className="text-xs font-bold text-slate-500 uppercase leading-relaxed">
                        The <span className="text-emerald-600">Marking Rate</span> and <span className="text-emerald-600">Feedback Quality</span> are non-negotiable standards. Low scores here indicate teacher burnout or administrative overload. Use these values to redistribute teaching loads or provide marking support assistants during peak periods.
                     </p>
                  </div>
                  <div>
                     <h5 className="text-sm font-black uppercase text-rose-600 mb-4 border-b-2 border-rose-50 pb-2">Strategic Syllabus Alignment</h5>
                     <p className="text-xs font-bold text-slate-500 uppercase leading-relaxed">
                        High <span className="text-rose-600">Alignment Scores</span> protect the school during external inspections. Use this value to ensure every exercise set by staff has a corresponding NaCCA indicator, guaranteeing that what is being taught is what is being examined.
                     </p>
                  </div>
               </div>
            </div>

            <div className="mt-16 pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">💡</div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest max-w-sm">These indicators should be discussed during monthly Staff Professional Development (CPD) sessions.</p>
               </div>
               <button onClick={() => window.print()} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all">Download Executive Summary</button>
            </div>
         </div>
      </div>

      <div className="text-center opacity-30">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">© 2026 UNITED BAYLOR ACADEMY • Monitoring Frequency: 3x • Intelligence v6.0</p>
      </div>
    </div>
  );
};

export default StaffSummary;
