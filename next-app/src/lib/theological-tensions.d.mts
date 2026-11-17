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
