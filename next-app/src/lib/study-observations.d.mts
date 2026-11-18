export type ObservationMarkupTag = 'key-word' | 'repeated-idea' | 'contrast' | 'command' | 'promise' | 'question';
export type PassageObservation = {
  id: string;
  kind: 'verse' | 'phrase';
  verse: number;
  text: string;
  tags: ObservationMarkupTag[];
  start: number;
  end: number;
};
export function listPassageObservations(input?: {
  passageKey?: string;
  verses?: Array<{ number: number; text: string }>;
  scriptureMarkup?: Record<string, Record<string, string[]>>;
  wordMarkup?: Record<string, Record<string, Array<{ start: number; end: number; tags: ObservationMarkupTag[] }>>>;
}): PassageObservation[];
