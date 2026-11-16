const DEFINITIONS = [
  [/^verb$/i, 'Verb', 'A word that expresses an action, event or state.'],
  [/^noun$/i, 'Noun', 'A word naming a person, place, thing or concept.'],
  [/^adjective$/i, 'Adjective', 'A word that describes or identifies a noun.'],
  [/^pronoun$/i, 'Pronoun', 'A word that stands in for or refers to a noun.'],
  [/^article$/i, 'Article', 'A grammatical word used with a noun; in Greek it can also help identify a noun phrase or substantival expression.'],
  [/^adverb$/i, 'Adverb', 'A word that modifies a verb, adjective or another adverb, often describing manner, time or degree.'],
  [/^preposition$/i, 'Preposition', 'A word expressing a relationship such as location, direction, means or association. Its object and context matter.'],
  [/^conjunction$/i, 'Conjunction', 'A linking word connecting words, phrases or clauses and showing the flow of thought.'],
  [/^imperfect$/i, 'Imperfect tense', 'In the Greek indicative, the imperfect normally locates an action in past time and presents it imperfectively—as unfolding, continuing or repeated. Context determines the nuance; it does not automatically mean uninterrupted action.'],
  [/^present$/i, 'Present tense', 'Greek present forms commonly present an action imperfectively—as in progress, characteristic or repeated. In the indicative they usually refer to present time, but context can affect the sense.'],
  [/^aorist$/i, 'Aorist tense', 'The aorist commonly presents an action as a whole, without focusing on its internal progress. In the indicative it often refers to past time. It does not by itself mean “once” or “instantaneous”.'],
  [/^future$/i, 'Future tense', 'Presents an action as future relative to the viewpoint of the clause. Context determines whether it functions as prediction, promise, intention or otherwise.'],
  [/^perfect$/i, 'Perfect tense', 'Often presents a past action or event with a continuing state or relevance in view. The precise relationship depends on the verb and context.'],
  [/^pluperfect$/i, 'Pluperfect tense', 'Typically presents a state resulting from an earlier action, viewed from a past reference point.'],
  [/^indicative$/i, 'Indicative mood', 'The mood commonly used to make an assertion or ask a question about a situation presented as a statement. It does not itself guarantee that a statement is objectively true.'],
  [/^subjunctive$/i, 'Subjunctive mood', 'Often used in expressions of possibility, purpose, expectation, condition or exhortation. The construction determines its particular force.'],
  [/^imperative$/i, 'Imperative mood', 'The mood commonly used for commands, instructions or requests.'],
  [/^optative$/i, 'Optative mood', 'A mood that can express a wish or possibility, among other less frequent uses.'],
  [/^infinitive$/i, 'Infinitive', 'A non-finite verbal form that can function in several ways, such as expressing purpose, result, explanation, or serving as a subject or object.'],
  [/^participle$/i, 'Participle', 'A verbal adjective form. It may express time, cause, manner, means, condition or other relationships, depending on context.'],
  [/^active$/i, 'Active voice', 'The grammatical subject is presented as performing or initiating the action. This describes grammatical voice, not necessarily moral responsibility.'],
  [/^middle$/i, 'Middle voice', 'The subject is presented as involved in the action in a way that may have special reference to the subject. The exact meaning varies by verb and context.'],
  [/^passive$/i, 'Passive voice', 'The subject is presented as receiving or undergoing the action rather than performing it. The agent may be stated or left unstated.'],
  [/^middle[/-]passive$/i, 'Middle/passive voice', 'This form can function as middle or passive. The verb, syntax and context are needed to decide which sense applies.'],
  [/^(1st|first) person$/i, 'First person', 'The speaker or writer: “I” in the singular, “we” in the plural.'],
  [/^(2nd|second) person$/i, 'Second person', 'The person or people addressed: “you”.'],
  [/^(3rd|3d|third) person$/i, 'Third person', 'Someone or something spoken about: “he”, “she”, “it” or “they”, depending on number and context.'],
  [/^singular$/i, 'Singular number', 'The form refers to one grammatical subject or entity.'],
  [/^plural$/i, 'Plural number', 'The form refers to more than one grammatical subject or entity.'],
  [/^dual$/i, 'Dual number', 'A grammatical number used for exactly two. It is not a regular feature of New Testament Greek.'],
  [/^nominative$/i, 'Nominative case', 'Often marks the subject or a predicate noun, though its function must be identified from the sentence.'],
  [/^genitive$/i, 'Genitive case', 'Often expresses relationships such as possession, source, description or association. The construction determines the precise relationship.'],
  [/^dative$/i, 'Dative case', 'Can express relationships such as indirect object, means, location or reference. Context and construction determine the function.'],
  [/^accusative$/i, 'Accusative case', 'Often marks the direct object or the extent, direction or goal of an action.'],
  [/^vocative$/i, 'Vocative case', 'Used for direct address.'],
  [/^masculine$/i, 'Masculine gender', 'A grammatical gender category; it does not necessarily indicate biological sex or that the referent is male.'],
  [/^feminine$/i, 'Feminine gender', 'A grammatical gender category; it does not necessarily indicate biological sex or that the referent is female.'],
  [/^neuter$/i, 'Neuter gender', 'A grammatical gender category, commonly used for things and concepts, and sometimes for people or groups.'],
  [/^qal$/i, 'Qal stem', 'The common/simple Hebrew verbal stem. Meaning still depends on the particular verb and context.'],
  [/^niphal$/i, 'Niphal stem', 'Often has passive or middle/reflexive force in Hebrew, but does not have one fixed meaning for every verb.'],
  [/^piel$/i, 'Piel stem', 'A derived Hebrew stem with a range of meanings, sometimes intensive, factitive or causative. Do not assume “intensive” automatically.'],
  [/^pual$/i, 'Pual stem', 'Generally the passive counterpart of Piel, with meaning determined by the verb and context.'],
  [/^hiphil$/i, 'Hiphil stem', 'Often expresses causative or declarative meanings in Hebrew, though individual verbs can develop specialised senses.'],
  [/^hophal$/i, 'Hophal stem', 'Generally the passive counterpart of Hiphil.'],
  [/^hithpael$/i, 'Hithpael stem', 'Often expresses reflexive, reciprocal or middle-like meanings, but the lexical verb and context determine the sense.'],
  [/^wayyiqtol$|^waw consecutive$/i, 'Wayyiqtol / waw-consecutive', 'A Hebrew verbal construction commonly used to advance past narrative sequence. Its function is identified from the form and discourse context.'],
  [/^infinitive construct$/i, 'Infinitive construct', 'A Hebrew non-finite verbal form that can function in constructions such as purpose, time or as a complement.'],
  [/^infinitive absolute$/i, 'Infinitive absolute', 'A Hebrew verbal form often used for emphasis or certainty, or in combination with another verb; the construction determines its force.']
];
const normalize = value => String(value || '').trim().replace(/\\s+/g, ' ').replace(/[–—]/g, '-');
export function explainMorphology(parsing) {
  const groups = normalize(parsing).split(/\\s+-\\s+/).filter(Boolean);
  const results = [];
  for (const group of groups) {
    const tokens = group.split(' ');
    for (let i = 0; i < tokens.length; i += 1) {
      const candidates = [tokens.slice(i, i + 3).join(' '), tokens.slice(i, i + 2).join(' '), tokens[i]];
      const match = candidates.map(term => ({ term, definition: DEFINITIONS.find(([pattern]) => pattern.test(term)) })).find(item => item.definition);
      if (!match) continue;
      results.push({ term: match.term, title: match.definition[1], explanation: match.definition[2] });
      i += match.term.split(' ').length - 1;
    }
  }
  const seen = new Set();
  return results.filter(item => { const key = item.title.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; });
}
