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
  resolution?: string;
  resolutionRationale?: string;
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
  previousResolution: string | null;
  resolutionSnapshot: string;
  resolutionRationaleSnapshot: string;
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


export type TheologicalTensionDossierEvidence = {
  kind: string;
  reference: string;
  detail: string;
  source: string;
  sourceUrl: string;
  relationship: string;
  sourceQuality: string;
  verificationStatus: string;
  assessmentRationale: string;
  verificationRationale: string;
  sourceQualityRationale: string;
  createdAt: string;
};

export type TheologicalTensionDossier = {
  title: string;
  generatedAt: string;
  studyPassage: string;
  doctrinalClaim: string;
  claimLevel: string;
  claimSynthesisStatus: string;
  originalSynthesis: string;
  synthesisReasoning: string;
  refinedDoctrinalFormulation: string;
  doctrineSupportingPassages: string;
  doctrineCounterTexts: string;
  doctrineReviewQuestions: string;
  doctrineReviewApproved: boolean;
  doctrineReviewUpdatedAt: string;
  assessment: string;
  assessmentLabel: string;
  status: string;
  statusLabel: string;
  passages: Array<{ label: string; reference: string; context: string }>;
  issue: string;
  interpretiveAnalysis: string;
  currentResearcherPosition: string;
  researchConclusion: string;
  resolutionRationale: string;
  evidence: TheologicalTensionDossierEvidence[];
  history: TheologicalTensionHistoryEntry[];
  remainingUncertainty: string;
  recordUpdatedAt: string;
  methodNote: string;
};

export function buildTheologicalTensionDossier(
  record: IndexedTheologicalTension & { resolution?: string; resolutionRationale?: string },
  options?: {
    generatedAt?: string;
    doctrineReview?: {
      claimLevel?: string;
      supportingPassages?: string;
      tensions?: string;
      formulation?: string;
      unresolved?: string;
      approved?: boolean;
      updatedAt?: string;
    };
    claimSynthesis?: {
      status?: string;
      conclusion?: string;
      reasoning?: string;
    };
    evidenceRecords?: Array<Partial<TheologicalTensionDossierEvidence>>;
  }
): TheologicalTensionDossier;
