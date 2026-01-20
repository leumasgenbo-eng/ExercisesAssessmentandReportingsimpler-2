
export type AssessmentType = 'CLASS' | 'HOME' | 'PROJECT' | 'CRITERION';

export type ManagementSubView = 'SUBJECT_MAPPING' | 'PLANNING' | 'COMPLIANCE' | 'ADMIN' | 'ARCHIVE' | 'REGISTRY';

export type SchoolGroup = 'DAYCARE' | 'KINDERGARTEN' | 'LOWER_BASIC' | 'UPPER_BASIC' | 'JHS';

export type FacilitatorRoleType = 'CLASS_BASED' | 'SUBJECT_BASED';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME';

export type PlanningRemarks = 'Completed successfully' | 'Partially completed' | 'Uncompleted' | 'Repeated' | '';

export type UserRole = 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'FACILITATOR' | 'GUEST';

export interface UserSession {
  role: UserRole;
  nodeName: string;
  nodeId: string;
  facilitatorId?: string;
  facilitatorName?: string;
}

export interface SchoolSettings {
  name: string;
  slogan: string;
  address: string;
  contact: string;
  email: string;
  website: string;
  logo?: string;
  complianceThreshold: number; 
  poorPerformanceThreshold: number; 
  poorPerformanceFrequency: number; 
  currentTerm: string;
  currentYear: string;
  activeMonth: string;
  excludedDepartments?: SchoolGroup[];
  institutionalId?: string; 
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  email: string;
  uniqueCode?: string; // For Facilitator Login
}

export interface Subject {
  id: string;
  name: string;
}

export interface FacilitatorSubjectMapping {
  id: string;
  staffId: string;
  subjectId: string;
  className: string;
  type: FacilitatorRoleType;
  employmentType: EmploymentType;
}

export interface Strand {
  id: string;
  name: string;
  substrands: Substrand[];
}

export interface Substrand {
  id: string;
  name: string;
  indicators: string[]; 
}

export interface WeeklyMapping {
  id: string;
  className: string;
  subject: string;
  week: string;
  weekStartDate?: string;
  weekEndDate?: string;
  strand: string;
  substrand: string;
  contentStandard: string;
  indicators: string;
  resources: string[];
  pages: string;
  areasCovered: string;
  remarks: PlanningRemarks;
  bloomsLevels?: string[]; 
  classWorkCount: number;
  homeWorkCount: number;
  projectWorkCount: number;
}

export interface WeeklyLog {
  id: string;
  week: string;
  staffId: string;
  mappingId: string;
  exerciseCount: number;
  timestamp: string;
  status: 'COMPLIANT' | 'DEFAULTER';
  reason?: string;
}

export interface InterventionRecord {
  id: string;
  date: string;
  week: string;
  subject: string;
  reasonCategory: string;
  actionTaken: string;
  notes: string;
  facilitator: string;
}

export interface Pupil {
  id: string;
  studentId?: string;
  name: string;
  gender?: 'M' | 'F' | 'Other';
  bookOpen?: boolean; 
  bookStatusDate?: string; 
  scores: Record<number, string>; 
  scoreReasons?: Record<number, string>; 
  interventionReason?: string; 
  interventions?: InterventionRecord[];
  correctionStatus?: Record<number, { done: boolean; marked: boolean }>;
}

export interface ExerciseMetadata {
  id: number;
  date: string;
  maxScore: string;
  indicatorCode?: string; 
  indicatorCodes?: string[]; 
  skillLabel?: string; 
}

export interface AssessmentAttachment {
  name: string;
  data: string; // base64
  mimeType: string;
}

export interface AssessmentData {
  term: string;
  year: string;
  month: string;
  week: string;
  className: string;
  facilitator: string;
  subject?: string;
  exercises: Record<number, ExerciseMetadata>;
  pupils: Pupil[];
  attachment?: AssessmentAttachment;
}

export interface MasterPupilEntry {
  studentId?: string;
  name: string;
  gender: 'M' | 'F' | 'Other';
}

export interface RegisteredSchool {
  id: string;
  name: string;
  timestamp: string;
  email?: string;
  contact?: string;
  location?: string;
  notified?: boolean;
}

export interface ManagementState {
  settings: SchoolSettings;
  staff: Staff[];
  subjects: Subject[];
  curriculum: Strand[];
  mappings: FacilitatorSubjectMapping[];
  weeklyMappings: WeeklyMapping[];
  logs: WeeklyLog[];
  masterPupils?: Record<string, MasterPupilEntry[]>;
  superAdminRegistry?: RegisteredSchool[]; 
}

export interface AppState {
  classWork: Record<string, AssessmentData>;
  homeWork: Record<string, AssessmentData>;
  projectWork: Record<string, AssessmentData>;
  criterionWork: Record<string, AssessmentData>;
  bookCountRecords: Record<string, { count: number; date: string; enrollment?: number }>; 
  management: ManagementState;
}
