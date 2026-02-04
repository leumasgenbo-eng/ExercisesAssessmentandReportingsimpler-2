/**
 * SSMAP CORE SCHEMA v9.6.2
 * United Baylor Academy - Clinical Inclusion Module
 */

export type AssessmentType = 'CLASS' | 'HOME' | 'PROJECT' | 'CRITERION';

export type SchoolGroup = 'DAYCARE' | 'KINDERGARTEN' | 'LOWER_BASIC' | 'UPPER_BASIC' | 'JHS';

export type FacilitatorCategory = 
  | 'DAYCARE_FACILITATOR' 
  | 'KG_FACILITATOR' 
  | 'BASIC_SUBJECT_LEVEL' 
  | 'JHS_SPECIALIST'      
  | 'ADMINISTRATOR'
  | 'CLINICAL_SPECIALIST';

export type FacilitatorRoleType = 'CLASS_BASED' | 'SUBJECT_BASED';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME';

export type UserRole = 'super_admin' | 'school_admin' | 'facilitator' | 'pupil';

// --- SPECIAL NEEDS MODULE ---
export type SpecialNeedSeverity = 'MILD' | 'MODERATE' | 'SEVERE' | 'PROFOUND';

export interface SpecialPupilRecord {
  id: string;
  pupilId: string;
  pupilName: string;
  className: string;
  category: string;
  severity: SpecialNeedSeverity;
  facilitatorId: string;
  facilitatorNote: string;
  specialistConfirmed: boolean;
  specialistId?: string;
  specialistNote?: string;
  learningApproach: string;
  furtherRecommendations: string;
  timestamp: string;
  lastAuditDate?: string;
}

export interface SpecialNeedsAudit {
  id: string;
  timeframe: 'WEEK' | 'MONTH' | 'TERM' | 'YEAR';
  value: string;
  timestamp: string;
  auditorId: string;
  aggregateAnalysis: string;
  cohortSize: number;
  complianceScore: number;
  performanceDelta: number;
}

export interface Staff {
  id: string;               
  name: string;
  role: string;
  category: FacilitatorCategory; 
  email: string;
  uniqueCode: string;       
}

export interface MasterPupilEntry {
  studentId: string;        
  name: string;
  gender: 'M' | 'F' | 'Other';
  isJhsLevel: boolean;      
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
  studentId: string;        
  name: string;
  gender?: 'M' | 'F' | 'Other';
  bookOpen?: boolean;       
  scores: Record<number, string>; 
  interventions?: InterventionRecord[];
  correctionStatus?: Record<number, { done: boolean; marked: boolean }>;
  scoreReasons?: Record<number, string>;
  interventionReason?: string;
}

export interface ExerciseMetadata {
  id: number;
  date: string;
  maxScore: string;
  indicatorCodes?: string[]; 
  skillLabel?: string;
}

/**
 * Added AssessmentAttachment type to support clinical/external card uploads
 */
export interface AssessmentAttachment {
  name: string;
  data: string; // base64 encoded string
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
  /**
   * Added attachment support for assessment records
   */
  attachment?: AssessmentAttachment;
}

export interface Message {
  id: string;
  from: string;
  to: 'ADMIN' | 'FACILITATORS';
  text: string;
  timestamp: string;
  read: boolean;
}

export interface WeeklyMapping {
  id: string;
  className: string;
  subject: string;
  week: string;
  strand: string;
  substrand: string;
  contentStandard: string;
  indicators: string;
  remarks: PlanningRemarks;
  classWorkCount: number;
  homeWorkCount: number;
  projectWorkCount: number;
  /**
   * Added planning metadata properties
   */
  resources?: string[];
  bloomsLevels?: string[];
  weekStartDate?: string;
  weekEndDate?: string;
  areasCovered?: string;
  pages?: string;
}

export type PlanningRemarks = 'Completed successfully' | 'Partially completed' | 'Uncompleted' | 'Repeated' | '';

export interface FacilitatorSubjectMapping {
  id: string;
  staffId: string;
  className: string;
  subjectId: string;
  type: FacilitatorRoleType;
  /**
   * Added employmentType to track contract status in mappings
   */
  employmentType: EmploymentType;
}

/**
 * Added CurriculumEntry for NaCCA syllabus integration
 */
export interface CurriculumEntry {
  id: string;
  levelGroup: SchoolGroup;
  subject: string;
  strand: string;
  subStrand?: string;
  contentStandard?: string;
  indicatorCode: string;
  indicatorText: string;
}

/**
 * Added UserSession for identity management and merit tracking
 */
export interface UserSession {
  role: UserRole;
  nodeName: string;
  nodeId: string;
  hubId?: string;
  facilitatorId?: string;
  facilitatorName?: string;
  facilitatorCategory?: FacilitatorCategory;
  meritBalance?: number;
  monetaryBalance?: number;
  pupilId?: string;
}

/**
 * Added RegisteredSchool for global node management
 */
export interface RegisteredSchool {
  id: string;
  name: string;
  location: string;
  timestamp: string;
  notified: boolean;
}

/**
 * Added ManagementSubView for router control
 */
export type ManagementSubView = 'SUBJECT_MAPPING' | 'PLANNING' | 'COMPLIANCE' | 'ROSTER';

export interface ManagementState {
  settings: {
    name: string;
    institutionalId: string;
    hubId: string;
    /**
     * Added institutional metadata fields
     */
    slogan?: string;
    address?: string;
    contact?: string;
    email?: string;
    website?: string;
    logo?: string;
    currentTerm: string;
    currentYear: string;
    activeMonth: string;
    poorPerformanceThreshold: number;
    poorPerformanceFrequency: number;
    complianceThreshold: number;
    announcement?: { id: string; text: string; timestamp: string; active: boolean; };
  };
  staff: Staff[];
  subjects: { id: string; name: string }[];
  mappings: FacilitatorSubjectMapping[];
  weeklyMappings: WeeklyMapping[];
  masterPupils: Record<string, MasterPupilEntry[]>;
  messages: Message[];
  specialNeedsRegistry: SpecialPupilRecord[];
  specialNeedsAudits: SpecialNeedsAudit[];
  /**
   * Added extended registry fields
   */
  curriculum?: CurriculumEntry[];
  superAdminRegistry?: RegisteredSchool[];
}

export interface AppState {
  classWork: Record<string, AssessmentData>;
  homeWork: Record<string, AssessmentData>;
  projectWork: Record<string, AssessmentData>;
  criterionWork: Record<string, AssessmentData>;
  bookCountRecords: Record<string, any>;
  management: ManagementState;
}