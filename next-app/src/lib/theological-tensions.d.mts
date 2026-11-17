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
