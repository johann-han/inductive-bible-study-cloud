import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWorkspaceArchive,
  validateWorkspaceArchive,
  planWorkspaceArchiveImport,
  applyWorkspaceArchiveImport
} from './workspace-archive.mjs';

const markupColors = {
  'key-word': '#f5e7b9',
  'repeated-idea': '#dcece0',
  contrast: '#f3dfd7',
  command: '#e6e1f1',
  promise: '#f6edc9',
  question: '#dce9f2'
};

const sourceDrafts = {
  'Romans|1': {
    observe: 'Romans 1:1 — BSB\nPaul, a servant of Christ Jesus, called to be an apostle, and set apart for the gospel of God—',
    interpret: '', doctrine: '', apply: '', activeStage: 'observe'
  },
  'Matthew|4': {
    observe: '', interpret: '', doctrine: '', apply: '', activeStage: 'observe'
  },
  'Leviticus|26': {
    observe: 'Leviticus 26:3 — BSB\nIf you follow My statutes and carefully keep My commandments,\n\nLeviticus 26:4 — BSB\nI will give you rains in their season, and the land will yield its produce.',
    interpret: '', doctrine: '', apply: '', activeStage: 'observe'
  },
  'Matthew|5': {
    observe: 'Matthew 5:1 — BSB\nWhen Jesus saw the crowds, He went up on the mountain and sat down. His disciples came to Him,\n\nMatthew 5:2 — BSB\nand He began to teach them, saying:',
    interpret: '', doctrine: '', apply: '', activeStage: 'apply'
  }
};

const sourceEvidence = [{
  id: '4d7d2c35-e58f-42e6-9ba1-41aabbda526c',
  passageKey: 'Matthew|5',
  stage: 'observe',
  claim: 'Jesus led the crowd up the mountain to avoid distraction',
  relationship: 'context',
  sourceQuality: 'unassessed',
  verificationStatus: 'not_checked',
  kind: 'Cross-reference',
  reference: 'Matthew 5:1 → John 6:2-3',
  detail: 'Source passage anchor: “went up on the mountain”\nTarget Scripture reference: John 6:2-3',
  source: 'CrossReferences.org · Treasury of Scripture Knowledge · CC BY 4.0',
  sourceUrl: 'https://github.com/CrossReferences-org/bible-cross-references',
  sourceId: 'Matthew.5.1.45450',
  createdAt: '2026-11-17T06:31:49.513Z'
}];

const sourceClaimSynthesis = {
  'Matthew|5::jesus led the crowd up the mountain to avoid distraction': {
    status: 'under_review',
    conclusion: 'John stated that Jesus led the crowds who saw Him heal the sick and followed Him, up the mountain.',
    reasoning: '',
    updatedAt: '2026-11-17T06:34:25.254Z'
  }
};

function emptyWorkspace() {
  return {
    drafts: {},
    scriptureMarkup: {},
    wordMarkup: {},
    markupColors: {},
    crossReferences: [],
    evidence: [],
    claimSynthesis: {},
    doctrineReviews: {},
    theologicalTensions: {},
    dossierVersions: []
  };
}

test('round-trips the recovered PR #187 workspace into PR #188 without losing local records', () => {
  const sourceStores = {
    ...emptyWorkspace(),
    drafts: sourceDrafts,
    markupColors,
    evidence: sourceEvidence,
    claimSynthesis: sourceClaimSynthesis
  };
  const localStores = {
    ...emptyWorkspace(),
    drafts: {
      'John|1': {
        observe: 'John 1:1 — BSB\nIn the beginning was the Word, and the Word was with God, and the Word was God.\n\nJohn 1:2 — BSB\nHe was with God in the beginning.\n\nJohn 1:3 — BSB\nThrough Him all things were made, and without Him nothing was made that has been made.\n\nJohn 1:4 — BSB\nIn Him was life, and that life was the light of men.',
        interpret: '', doctrine: '', apply: '', activeStage: 'observe'
      }
    },
    markupColors: structuredClone(markupColors)
  };

  const incomingArchive = buildWorkspaceArchive(sourceStores, {
    exportedAt: '2026-11-17T15:44:06.027Z'
  });
  const validatedIncoming = validateWorkspaceArchive(incomingArchive);
  const preflight = planWorkspaceArchiveImport(validatedIncoming, localStores);

  assert.equal(preflight.drafts.incomingCount, 4);
  assert.equal(preflight.drafts.newItems, 4);
  assert.equal(preflight.markupColors.identical, 6);
  assert.equal(preflight.evidence.newItems, 1);
  assert.equal(preflight.claimSynthesis.newItems, 1);

  const mergedStores = applyWorkspaceArchiveImport(validatedIncoming, localStores, {}, 'merge');
  const roundTripArchive = buildWorkspaceArchive(mergedStores);
  const validatedRoundTrip = validateWorkspaceArchive(roundTripArchive);

  assert.deepEqual(
    Object.keys(validatedRoundTrip.stores.drafts).sort(),
    ['John|1', 'Leviticus|26', 'Matthew|4', 'Matthew|5', 'Romans|1']
  );
  assert.deepEqual(validatedRoundTrip.stores.drafts['John|1'], localStores.drafts['John|1']);

  for (const [passage, draft] of Object.entries(sourceDrafts)) {
    assert.deepEqual(validatedRoundTrip.stores.drafts[passage], draft);
  }

  assert.deepEqual(validatedRoundTrip.stores.markupColors, markupColors);
  assert.deepEqual(validatedRoundTrip.stores.evidence, sourceEvidence);
  assert.deepEqual(validatedRoundTrip.stores.claimSynthesis, sourceClaimSynthesis);
  assert.equal(validatedRoundTrip.counts.drafts, 5);
  assert.equal(validatedRoundTrip.counts.evidence, 1);
  assert.equal(validatedRoundTrip.counts.claimSynthesis, 1);
  assert.equal(validatedRoundTrip.counts.markupColors, 6);
  assert.equal(validatedRoundTrip.counts.scriptureMarkup, 0);
  assert.equal(validatedRoundTrip.counts.wordMarkup, 0);
  assert.equal(validatedRoundTrip.counts.crossReferences, 0);
  assert.equal(validatedRoundTrip.counts.doctrineReviews, 0);
  assert.equal(validatedRoundTrip.counts.theologicalTensions, 0);
  assert.equal(validatedRoundTrip.counts.dossierVersions, 0);
});
