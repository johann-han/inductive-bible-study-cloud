export type ComparisonPassageResult = {
  reference: string;
  text: string;
  source?: string;
  related?: string[];
};

export type ComparisonPassageImport = {
  reference: string;
  context: string;
};

export function buildComparisonPassageImport(result: ComparisonPassageResult): ComparisonPassageImport;


export type TensionAssessment =
  | 'unclassified'
  | 'apparent_tension'
  | 'complementary'
  | 'unresolved'
  | 'perceived_contradiction';

export type TensionStatus =
  | 'open'
  | 'under_review'
  | 'provisionally_addressed'
  | 'researcher_resolved';

export type TheologicalTensionRecord = {
  id: string;
  history?: TheologicalTensionHistoryEntry[];
  passageA: string;
  contextA: string;
  passageB: string;
  contextB: string;
  issue: string;
  analysis: string;
  uncertainty: string;
  assessment: TensionAssessment;
  status: TensionStatus;
  updatedAt: string;
};

export type IndexedTheologicalTension = TheologicalTensionRecord & {
  reviewKey: string;
  studyKey: string;
  claimKey: string;
  studyPassage: string;
  claimDisplay?: string;
};

export function listTheologicalTensionRecords(
  tensionMap: Record<string, TheologicalTensionRecord[]>
): IndexedTheologicalTension[];

export function filterTheologicalTensionRecords(
  records: IndexedTheologicalTension[],
  filters?: {
    search?: string;
    assessment?: TensionAssessment | 'all';
    status?: TensionStatus | 'all';
  }
): IndexedTheologicalTension[];


export type TensionHistoryEventType =
  | 'initial_position'
  | 'interpretive_revision'
  | 'assessment_change'
  | 'resolution_proposed'
  | 'resolution_revised'
  | 'reopened'
  | 'other';

export type TheologicalTensionHistoryEntry = {
  id: string;
  recordedAt: string;
  eventType: TensionHistoryEventType;
  previousAssessment: TensionAssessment | null;
  assessment: TensionAssessment;
  previousStatus: TensionStatus | null;
  status: TensionStatus;
  previousResearcherPosition: string | null;
  previousAnalysisSnapshot: string | null;
  previousUncertaintySnapshot: string | null;
  passageA: string;
  contextA: string;
  passageB: string;
  contextB: string;
  issue: string;
  researcherPosition: string;
  analysisSnapshot: string;
  evidenceConsidered: string;
  uncertaintySnapshot: string;
  rationale: string;
};

export function appendTheologicalTensionHistory(
  record: TheologicalTensionRecord & { history?: TheologicalTensionHistoryEntry[] },
  input: {
    eventType: TensionHistoryEventType;
    rationale: string;
    researcherPosition: string;
    evidenceConsidered?: string;
  },
  metadata: { id: string; recordedAt: string }
): TheologicalTensionRecord & { history: TheologicalTensionHistoryEntry[] };
