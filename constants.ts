
import { AssessmentData, ManagementState, SchoolGroup, AssessmentType } from './types';

export const SCHOOL_NAME = "UNITED BAYLOR ACADEMY";
export const SHEET_TITLE = "ASSESSMENT SHEET FOR EXERCISES AND ASSIGNMENT";
export const WEEK_COUNT = 16;

export const SUPER_ADMIN_EMAIL = "leumasgenbo4@gmail.com";
export const SUPER_ADMIN_CONTACT = "+233243504091";

export const EXERCISES_PER_TYPE: Record<AssessmentType, number> = {
  CLASS: 5,
  HOME: 5,
  PROJECT: 1,
  CRITERION: 12 // 6 Skills x 2 (Before + After)
};

export const ACADEMIC_YEAR_RANGE = Array.from({ length: 14 }, (_, i) => {
  const start = 2022 + i;
  return `${start}/${start + 1}`;
});

export const CRITERION_SKILLS = [
  "Reading Skill",
  "Numeracy",
  "Handwriting",
  "Spelling",
  "Spatial Awareness",
  "Any Other"
];

export const INTERVENTION_REASONS = [
  "R1: Phonological/Literacy Gap",
  "R2: Numerical/Fluency Delay",
  "R3: Working Memory Deficit",
  "R4: Fine/Gross Motor Challenge",
  "R5: Auditory Processing Issue",
  "R6: Visual Perception Difficulty",
  "R7: Executive Functioning Gap",
  "R8: Social-Emotional Stressor",
  "R9: Health/Physical Condition",
  "R10: Environmental/Home Factor",
  "R11: Chronic Absenteeism Impact",
  "R12: Low Intrinsic Motivation"
];

export const INTERVENTION_ACTIONS = [
  "A1: Differentiated Instruction",
  "A2: Multisensory Scaffolding",
  "A3: Task Modification (Level)",
  "A4: Specialized Remedial Support",
  "A5: Parent-Teacher Consult",
  "A6: Behavioral Intervention Plan",
  "A7: Counseling/Guidance Referral",
  "A8: Adaptive Tool/Tech Usage",
  "A9: Extended Time/Buffer Zone",
  "A10: Peer-Assisted Learning",
  "A11: Frequent Formative Feedback",
  "A12: Sensory/Focus Break Strategy"
];

export const LITERACY_ASPECTS = [
  "Oral Language (Listening & Speaking)",
  "Reading (Phonics & Comprehension)",
  "Writing (Composition & Mechanics)",
  "Grammar (Usage & Vocabulary)",
  "Creative Text & Literature"
];

export const LITERACY_INDICATOR_CATEGORIES = [
  "Auditory Processing & Expression",
  "Decoding & Text Interpretation",
  "Sentence Structure & Orthography",
  "Parts of Speech & Punctuation",
  "Critical Analysis & Creativity"
];

export const SCHOOL_HIERARCHY: Record<SchoolGroup, { label: string; classes: string[] }> = {
  DAYCARE: {
    label: "Daycare",
    classes: ["Creche 1", "Creche 2", "Nursery 1", "Nursery 2"]
  },
  KINDERGARTEN: {
    label: "Kindergarten",
    classes: ["Kindergarten 1", "Kindergarten 2"]
  },
  LOWER_BASIC: {
    label: "Lower Basic",
    classes: [
      "Basic 1A", "Basic 1B", "Basic 2A", "Basic 2B", "Basic 3A", "Basic 3B"
    ]
  },
  UPPER_BASIC: {
    label: "Upper Basic",
    classes: [
      "Basic 4A", "Basic 4B", "Basic 5A", "Basic 5B", "Basic 6A", "Basic 6B"
    ]
  },
  JHS: {
    label: "Junior High",
    classes: [
      "Basic 7A", "Basic 7B", 
      "Basic 8A", "Basic 8B", 
      "Basic 9A", "Basic 9B"
    ]
  }
};

export const SUBJECTS_BY_GROUP: Record<SchoolGroup, string[]> = {
  DAYCARE: [
    "Numeracy",
    "Creativity",
    "Language and Literacy",
    "Our World Our People (OWOP)",
    "Any added subject or learning area"
  ],
  KINDERGARTEN: [
    "Numeracy",
    "Creativity",
    "Language and Literacy",
    "Our World Our People (OWOP)",
    "Any added subject or learning area"
  ],
  LOWER_BASIC: [
    "Religious and Moral Education",
    "History",
    "ICT",
    "Creative Arts",
    "Science",
    "Our World Our People (OWOP)",
    "Ghanaian Language Option",
    "French",
    "Mathematics",
    "English Language",
    "Physical Education"
  ],
  UPPER_BASIC: [
    "Religious and Moral Education",
    "History",
    "ICT",
    "Creative Arts",
    "Science",
    "Our World Our People (OWOP)",
    "Ghanaian Language Option",
    "French",
    "Mathematics",
    "English Language",
    "Physical Education"
  ],
  JHS: [
    "Religious and Moral Education",
    "History",
    "ICT",
    "Creative Arts and Designing",
    "Science",
    "Career Technology",
    "Ghanaian Language Option",
    "French",
    "Mathematics",
    "English Language",
    "Physical Education"
  ]
};

export const createInitialAssessmentData = (week: string, type: AssessmentType): AssessmentData => {
  const count = EXERCISES_PER_TYPE[type];
  return {
    term: "1ST TERM",
    year: "2024/2025",
    month: "MONTH 1",
    week: week,
    className: "Basic 1A",
    facilitator: "",
    subject: "",
    exercises: Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      date: "",
      maxScore: '10',
      skillLabel: type === 'CRITERION' ? CRITERION_SKILLS[Math.floor((i)/2)] : undefined
    })).reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {}),
    pupils: []
  };
};

export const INITIAL_MANAGEMENT_DATA: ManagementState = {
  settings: {
    name: "UNITED BAYLOR ACADEMY",
    slogan: "Knowledge is Power",
    address: "P.O. Box GP 123, Accra, Ghana",
    contact: "+233 20 000 0000",
    email: "admin@unitedbaylor.edu.gh",
    website: "www.unitedbaylor.edu.gh",
    complianceThreshold: 0.85,
    poorPerformanceThreshold: 10,
    poorPerformanceFrequency: 3,
    currentTerm: "1ST TERM",
    currentYear: "2024/2025",
    activeMonth: "MONTH 1",
    excludedDepartments: []
  },
  staff: [
    { id: 's1', name: 'John Doe', role: 'Teacher', email: 'john@baylor.edu' },
    { id: 's2', name: 'Jane Smith', role: 'Head of Daycare', email: 'jane@baylor.edu' },
    { id: 's3', name: 'Robert Wilson', role: 'HOD Science', email: 'robert@baylor.edu' }
  ],
  subjects: Array.from(new Set(Object.values(SUBJECTS_BY_GROUP).flat())).map((name, i) => ({
    id: `sub${i + 1}`,
    name
  })),
  curriculum: [
    { 
      id: 'str1', 
      name: 'Numbers and Algebra', 
      substrands: [
        { id: 'ss1', name: 'Linear Equations', indicators: ['M1.1', 'M1.2'] },
        { id: 'ss2', name: 'Fractions', indicators: ['M2.1'] }
      ] 
    }
  ],
  mappings: [
    { id: 'm1', staffId: 's1', subjectId: 'sub3', className: 'Basic 7A', type: 'SUBJECT_BASED', employmentType: 'FULL_TIME' },
    { id: 'm2', staffId: 's2', subjectId: 'sub1', className: 'Creche 1', type: 'CLASS_BASED', employmentType: 'FULL_TIME' }
  ],
  weeklyMappings: [
    {
      id: 'wm1',
      className: 'Basic 7A',
      subject: 'Mathematics',
      week: '1',
      weekStartDate: '2024-01-08',
      weekEndDate: '2024-01-12',
      strand: 'Numbers',
      substrand: 'Fractions',
      contentStandard: 'B7.1.1.1',
      indicators: 'M1.1, M1.2',
      resources: ['Math Textbook 7'],
      pages: '12-14',
      areasCovered: 'Introduction to equivalent fractions and simplification.',
      remarks: 'Completed successfully',
      classWorkCount: 5,
      homeWorkCount: 5,
      projectWorkCount: 1
    }
  ],
  logs: [
    { id: 'l1', week: '4', staffId: 's1', mappingId: 'm1', exerciseCount: 5, timestamp: '2023-11-20', status: 'COMPLIANT' },
    { id: 'l2', week: '4', staffId: 's2', mappingId: 'm2', exerciseCount: 0, timestamp: '2023-11-21', status: 'DEFAULTER', reason: 'Medical Leave' }
  ],
  masterPupils: {},
  superAdminRegistry: []
};
