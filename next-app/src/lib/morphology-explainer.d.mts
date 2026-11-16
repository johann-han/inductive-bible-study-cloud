export interface MorphologyExplanation { term: string; title: string; explanation: string; }
export declare function explainMorphology(parsing: string): MorphologyExplanation[];
