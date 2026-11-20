(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.KerygmaClaimReview = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  class ClaimReviewEngine {
    constructor(sermons, storage) {
      this.sermons = Array.isArray(sermons) ? sermons : [];
      this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    }

    setSermons(sermons) {
      this.sermons = Array.isArray(sermons) ? sermons : [];
    }

                claimReviewStorageKey() {
                return 'kerygma_claim_review_status_v1';
            }

                loadClaimReviewStatuses() {
                try {
                    const raw = this.storage.getItem(this.claimReviewStorageKey());
                    if (!raw) return {};
                    const parsed = JSON.parse(raw);
                    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
                } catch (error) {
                    return {};
                }
            }

                getClaimReviewStatus(sermonId, reviewKey) {
                const validStatuses = ['not-reviewed', 'reviewed', 'needs-research', 'requires-revision'];
                if (!sermonId || !reviewKey) return 'not-reviewed';
                const allStatuses = this.loadClaimReviewStatuses();
                const sermonStatuses = allStatuses[String(sermonId)];
                const status = sermonStatuses && typeof sermonStatuses === 'object'
                    ? sermonStatuses[String(reviewKey)] : '';
                return validStatuses.includes(status) ? status : 'not-reviewed';
            }

                saveClaimReviewStatus(sermonId, reviewKey, status) {
                const validStatuses = ['not-reviewed', 'reviewed', 'needs-research', 'requires-revision'];
                if (!sermonId || !reviewKey || String(reviewKey).length > 180 || !validStatuses.includes(status)) {
                    return false;
                }
                try {
                    const allStatuses = this.loadClaimReviewStatuses();
                    const key = String(sermonId);
                    const previous = allStatuses[key] && typeof allStatuses[key] === 'object' && !Array.isArray(allStatuses[key])
                        ? allStatuses[key] : {};
                    allStatuses[key] = { ...previous, [String(reviewKey)]: status };
                    this.storage.setItem(this.claimReviewStorageKey(), JSON.stringify(allStatuses));
                    return true;
                } catch (error) {
                    return false;
                }
            }

                makeClaimReviewKey(paragraphIndex, claim) {
                if (!Number.isInteger(Number(paragraphIndex)) || Number(paragraphIndex) < 1 ||
                    !claim || claim.kind !== 'claim' || !String(claim.proposition || '').trim()) {
                    return '';
                }
                const source = String(claim.proposition).toLowerCase().replace(/\s+/g, ' ').trim();
                let hash = 2166136261;
                for (let index = 0; index < source.length; index += 1) {
                    hash ^= source.charCodeAt(index);
                    hash = Math.imul(hash, 16777619);
                }
                return 'p' + Number(paragraphIndex) + '-s' + Number(claim.index || 0) + '-' + (hash >>> 0).toString(36);
            }

                buildClaimReviewQueue(sermonLimit = 100, itemLimit = 100) {
                const safeSermonLimit = Math.max(1, Math.min(100, Number(sermonLimit) || 100));
                const safeItemLimit = Math.max(1, Math.min(100, Number(itemLimit) || 100));
                const sermons = Array.isArray(this.sermons) ? this.sermons : [];
                const scanSermons = sermons.slice(0, safeSermonLimit);
                const storedStatuses = this.loadClaimReviewStatuses();
                const counts = { 'not-reviewed': 0, reviewed: 0, 'needs-research': 0, 'requires-revision': 0 };
                const items = [];
                let omittedItems = 0;
                let omittedParagraphBlocks = 0;
                let omittedSentenceItems = 0;

                scanSermons.forEach(sermon => {
                    if (!sermon || !String(sermon.manuscript || '').trim()) return;
                    const outline = Array.isArray(sermon.outline) ? sermon.outline : [];
                    const outlinePoints = outline.map((point, index) => ({
                        index: index + 1,
                        statement: String(point && point.statement || '').trim(),
                        reference: String(point && point.reference || '').trim(),
                        notes: String(point && point.notes || '').trim()
                    }));
                    const analysis = this.analyzeManuscriptClaimParagraphs(
                        String(sermon.manuscript || ''),
                        outlinePoints,
                        sermon.inductiveStudySource || null
                    );
                    omittedParagraphBlocks += Number(analysis.omittedCount) || 0;
                    omittedSentenceItems += Number(analysis.omittedSentenceCount) || 0;
                    const sermonStatuses = storedStatuses[String(sermon.id)] && typeof storedStatuses[String(sermon.id)] === 'object'
                        ? storedStatuses[String(sermon.id)] : {};

                    (Array.isArray(analysis.rows) ? analysis.rows : []).forEach(row => {
                        (Array.isArray(row.claims) ? row.claims : []).forEach(claim => {
                            if (!claim || claim.kind !== 'claim' || !String(claim.proposition || '').trim()) return;
                            const reviewKey = this.makeClaimReviewKey(row.index, claim);
                            const rawStatus = sermonStatuses[reviewKey];
                            const status = ['not-reviewed', 'reviewed', 'needs-research', 'requires-revision'].includes(rawStatus)
                                ? rawStatus : 'not-reviewed';
                            counts[status] += 1;
                            if (status !== 'needs-research' && status !== 'requires-revision') return;

                            if (items.length >= safeItemLimit) {
                                omittedItems += 1;
                                return;
                            }
                            items.push({
                                sermonId: String(sermon.id),
                                sermonTitle: String(sermon.title || 'Untitled Sermon').slice(0, 180),
                                passage: String(sermon.passage || 'Passage not recorded').slice(0, 100),
                                paragraphIndex: row.index,
                                claimIndex: claim.claimIndex,
                                sourceSentenceIndex: claim.index,
                                proposition: String(claim.proposition).slice(0, 600),
                                status,
                                reviewKey,
                                references: Array.isArray(claim.references) ? claim.references.slice(0, 4) : [],
                                outlineLinks: Array.isArray(claim.outlineLinks) ? claim.outlineLinks.slice(0, 2) : [],
                                divisionLinks: Array.isArray(claim.divisionLinks) ? claim.divisionLinks.slice(0, 2) : [],
                                flags: Array.isArray(claim.flags) ? claim.flags.slice(0, 4) : []
                            });
                        });
                    });
                });

                return {
                    items,
                    counts,
                    scannedSermons: scanSermons.length,
                    omittedSermons: Math.max(0, sermons.length - scanSermons.length),
                    omittedParagraphBlocks,
                    omittedSentenceItems,
                    omittedItems
                };
            }

                filterClaimReviewQueueItems(items, statusFilter = 'all', searchText = '') {
                const safeItems = Array.isArray(items) ? items : [];
                const status = String(statusFilter || 'all');
                const query = String(searchText || '').trim().toLowerCase();
                return safeItems.filter(item => {
                    if (!item || (status !== 'all' && item.status !== status)) return false;
                    if (!query) return true;
                    const readLabels = value => (Array.isArray(value) ? value : [])
                        .map(entry => typeof entry === 'string' ? entry :
                            (entry && (entry.text || entry.label) ? (entry.text || entry.label) : ''))
                        .join(' ');
                    const searchableText = [
                        item.sermonTitle,
                        item.passage,
                        item.proposition,
                        readLabels(item.references),
                        readLabels(item.outlineLinks),
                        readLabels(item.divisionLinks),
                        readLabels(item.flags)
                    ].map(value => String(value || '')).join(' ').toLowerCase();
                    return searchableText.includes(query);
                });
            }

                extractManuscriptClaimProposition(sentenceText) {
                const source = String(sentenceText || '').replace(/\s+/g, ' ').trim();
                if (!source) return { kind: 'unresolved', proposition: '', note: 'No sentence text was available for proposition review.' };

                const contextPatterns = [
                    /^(?:good (?:morning|afternoon|evening|day)\b|welcome\b|thank you\b|amen\b)/i,
                    /^(?:let us|let's|open your bibles|please turn|today, we turn (?:our )?(?:hearts and minds )?to\b|as we (?:begin|close|turn to)\b|we will (?:read|look at|turn to)\b)/i,
                    /^(?:this opening statement|this introductory statement|this sentence|this paragraph|as we (?:reflect|close|begin)|today, we (?:will|are going to) (?:read|look at|examine|turn to)\b)/i
                ];
                if (contextPatterns.some(pattern => pattern.test(source))) {
                    return {
                        kind: 'context',
                        proposition: '',
                        note: 'Greeting, transition, or instruction — no substantive proposition identified.'
                    };
                }

                const clean = value => String(value || '')
                    .replace(/^[\s“”‘’"']+|[\s“”‘’"']+$/g, '')
                    .replace(/[.!?]+$/, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                const title = value => value ? value.charAt(0).toUpperCase() + value.slice(1) : '';

                if (/\b(?:therefore thou art inexcusable|whosoever thou art that judgest)\b/i.test(source)) {
                    return { kind: 'claim', proposition: 'People who judge others are not exempt from accountability, especially when they commit the same wrongs.', note: 'Paraphrase candidate derived from the quoted wording; verify it against the passage.' };
                }
                if (/\bwherein thou judgest another, thou condemnest thyself\b/i.test(source)) {
                    return { kind: 'claim', proposition: 'Judging others while committing the same wrongs brings self-condemnation.', note: 'Paraphrase candidate derived from the quoted wording; verify it against the passage.' };
                }
                if (/\bthe goodness of God leadeth thee to repentance\b/i.test(source)) {
                    return { kind: 'claim', proposition: 'God’s goodness is intended to lead people to repentance.', note: 'Paraphrase candidate derived from the quoted wording; verify it against the passage.' };
                }
                if (/\bwho will render to every man according to his deeds\b/i.test(source)) {
                    return { kind: 'claim', proposition: 'God renders judgment to each person according to their deeds.', note: 'Paraphrase candidate derived from the quoted wording; verify it against the passage.' };
                }
                if (/\bthere is no respect of persons with God\b/i.test(source)) {
                    return { kind: 'claim', proposition: 'God shows no partiality in judgment.', note: 'Paraphrase candidate derived from the quoted wording; verify it against the passage.' };
                }

                let match = source.match(/^(?:in verses?\s+[\d–—-]+,?\s*)?(?:the apostle\s+)?Paul\s+warns\s+the person who judges others while doing the same things\b/i);
                if (match) {
                    return { kind: 'claim', proposition: 'People who judge others while committing the same wrongdoing are also accountable.', note: 'Candidate proposition; confirm its scope and wording against the cited verses.' };
                }

                match = source.match(/^(?:the apostle\s+)?Paul\b.*?\baddresses?\s+(?:a critical issue(?: that transcends time and culture)?|an important issue)\s*:\s*(.+)$/i);
                if (match) {
                    const issue = clean(match[1]).replace(/^the hypocrisy of judging others while being guilty of the same sins$/i,
                        'hypocrisy in judging others while committing the same sins');
                    return { kind: 'claim', proposition: 'The passage addresses ' + issue.replace(/^the\s+/i, '') + '.', note: 'Candidate proposition distilled from the sentence; verify that it preserves the author’s meaning.' };
                }
                match = source.match(/^(?:the apostle\s+)?Paul\b.*?\baddresses a universal truth\s*:\s*when we judge others, we often condemn ourselves because we are guilty of the same faults\.?$/i);
                if (match) {
                    return { kind: 'claim', proposition: 'Judging others while guilty of the same faults can lead to self-condemnation.', note: 'Candidate proposition distilled from the sentence; verify its meaning against the passage.' };
                }

                match = source.match(/^(?:in verses?\s+[\d–—-]+,?\s*)?(?:the apostle\s+)?Paul\s+(?:begins by (?:saying|stating)|states|says|teaches|argues|explains|emphasizes|contrasts|describes|reveals|indicates|asserts|writes|reminds us|highlights|demonstrates|shows)\s+(?:that\s+)?(.+)$/i);
                if (match && !/[“”‘’"]/.test(match[1])) {
                    let proposition = clean(match[1]);
                    proposition = proposition.replace(/^the person who judges others while doing the same things$/i,
                        'people who judge others while doing the same things are accountable');
                    return {
                        kind: 'claim',
                        proposition: title(proposition) + '.',
                        note: 'Candidate proposition distilled from the sentence; check it against the passage.'
                    };
                }

                match = source.match(/^(?:the phrase|this phrase|the wording)\s+.+?\s+(?:highlights|shows|emphasizes|underscores)\s+(?:the\s+)?hypocrisy(?: inherent)? in (.+)$/i);
                if (match) {
                    return { kind: 'claim', proposition: 'Judging others while ' + clean(match[1]) + ' is hypocritical.', note: 'Candidate proposition distilled from the sentence; verify its meaning.' };
                }

                match = source.match(/^(?:as we delve into this chapter,?\s*)?we will discover that\s+(.+)$/i);
                if (!match) match = source.match(/^.+?\bwe will discover that\s+(.+)$/i);
                if (match) {
                    let proposition = clean(match[1]);
                    const contrast = proposition.match(/^(.+?)\s+is not merely about\s+(.+?)\s+but\s+(.+)$/i);
                    if (contrast) proposition = title(contrast[1]) + ' is ' + clean(contrast[3]) + ' rather than merely ' + clean(contrast[2]);
                    else proposition = title(proposition);
                    return { kind: 'claim', proposition: proposition + '.', note: 'Candidate proposition distilled from the sentence; verify its meaning.' };
                }

                match = source.match(/^(?:this|that|it)\s+(?:means|shows|suggests|highlights|underscores|demonstrates|indicates|reveals)\s+(?:that\s+)?(.+)$/i);
                if (match) {
                    return { kind: 'claim', proposition: title(clean(match[1])) + '.', note: 'Candidate proposition distilled from the sentence; verify its meaning.' };
                }

                match = source.match(/^(?:the text|the passage|this verse|the verse|the chapter|Paul|Jesus|the author|the writer)\s+(?:states|says|teaches|argues|explains|warns|emphasizes|contrasts|describes|reveals|indicates|asserts|writes|reminds us|highlights|demonstrates|shows)\s+(?:that\s+)?(.+)$/i);
                if (match && !/[“”‘’"]/.test(match[1])) {
                    return { kind: 'claim', proposition: title(clean(match[1])) + '.', note: 'Candidate proposition distilled from the sentence; verify its meaning.' };
                }

                return {
                    kind: /[“”‘’"]/.test(source) ? 'quotation' : 'unresolved',
                    proposition: '',
                    note: /[“”‘’"]/.test(source)
                        ? 'Quotation or attribution detected; state its point in your own words and verify the wording.'
                        : 'No separate proposition was distilled automatically; review this sentence in the manuscript.'
                };
            }

                splitManuscriptClaimSentences(text) {
                const source = String(text || '').replace(/\s+/g, ' ').trim();
                if (!source) return [];

                const protectedPeriod = '\uE000';
                const abbreviations = /\b(?:Mr|Mrs|Ms|Mx|Dr|Prof|Rev|Fr|St|Jr|Sr|vs|etc|cf|v|vv|ch|chs|No|Vol|Nos)\.|(?:e\.g|i\.e|A\.D|B\.C|U\.S|U\.K)\./gi;
                const protectedText = source
                    .replace(abbreviations, match => match.replace(/\./g, protectedPeriod))
                    .replace(/\b(?:[A-Z]\.){1,4}/g, match => match.replace(/\./g, protectedPeriod));
                const sentences = [];
                const boundary = /[.!?…]+(?:["'”’)\]]*)\s+(?=[A-Z0-9“"'‘(\[])/g;
                let lastIndex = 0;
                let match;
                while ((match = boundary.exec(protectedText))) {
                    const sentence = protectedText.slice(lastIndex, boundary.lastIndex)
                        .replace(/\s+/g, ' ').trim().replaceAll(protectedPeriod, '.');
                    if (sentence) sentences.push(sentence);
                    lastIndex = boundary.lastIndex;
                }
                const finalSentence = protectedText.slice(lastIndex)
                    .replace(/\s+/g, ' ').trim().replaceAll(protectedPeriod, '.');
                if (finalSentence) sentences.push(finalSentence);
                return sentences;
            }

                analyzeManuscriptClaimParagraphs(manuscript, outlinePoints, packet) {
                const source = String(manuscript || '');
                const analysisSource = source.slice(0, 60000);
                const maxClaimReviewBlocks = 30;
                const maxClaimExcerptCharacters = 420;
                const studyRef = packet && packet.studyReference ? packet.studyReference : {};
                const studyBook = String(studyRef.book || '').trim();
                const chapterNumber = Number(studyRef.chapter);
                const normalizeBook = value => {
                    const key = String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (key === 'psalm') return 'psalms';
                    if (key === 'songofsongs' || key === 'canticles') return 'songofsolomon';
                    return key;
                };
                const classifySection = heading => {
                    const value = String(heading || '').toLowerCase();
                    if (/\b(introduction|opening|hook|setting the scene)\b/.test(value)) return 'Introduction';
                    if (/\b(application|response|discipleship|for believers|for seekers|putting it into practice)\b/.test(value)) return 'Application / response';
                    if (/\b(conclusion|closing|invitation|final thoughts?|call to action)\b/.test(value)) return 'Conclusion';
                    if (/^(?:[ivxlcdm]+[.)]|\d+[.)])\s+/.test(value)) return 'Exposition / outline';
                    if (/\b(exposition|exegesis|outline|point\s*\d|movement|verse|interpretation|text study)\b/.test(value)) return 'Exposition / outline';
                    return heading ? 'Unlabelled section — ' + String(heading).trim().slice(0, 70) : 'Unlabelled section';
                };

                const blocks = [];
                let activeSection = 'Unlabelled section';
                let activeHeading = '';
                let blockLines = [];
                const flushBlock = () => {
                    const blockText = blockLines.join(' ').replace(/\s+/g, ' ').trim();
                    if (blockText) blocks.push({ section: activeSection, heading: activeHeading, text: blockText });
                    blockLines = [];
                };
                analysisSource.split(/\r?\n/).forEach(line => {
                    const trimmed = line.trim();
                    if (!trimmed || /^([-*_])\1{2,}\s*$/.test(trimmed)) {
                        flushBlock();
                        return;
                    }
                    const heading = trimmed.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
                    if (heading) {
                        flushBlock();
                        activeHeading = heading[1].trim();
                        activeSection = classifySection(activeHeading);
                        return;
                    }
                    blockLines.push(trimmed);
                });
                flushBlock();

                const bibleBookNames = [
                    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
                    '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
                    'Nehemiah', 'Esther', 'Job', 'Psalms', 'Psalm', 'Proverbs', 'Ecclesiastes',
                    'Song of Solomon', 'Song of Songs', 'Canticles', 'Isaiah', 'Jeremiah', 'Lamentations',
                    'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum',
                    'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke',
                    'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
                    'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy',
                    '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
                    '1 John', '2 John', '3 John', 'Jude', 'Revelation'
                ];
                const escapedBookNames = bibleBookNames.slice().sort((a, b) => b.length - a.length).join('|');
                const studyBookKey = normalizeBook(studyBook);

                const getReferenceAnalysis = blockText => {
                    const references = [];
                    const occupiedSpans = [];
                    const passageRanges = [];
                    if (!blockText || references.length >= 12) return { references, passageRanges };

                    const bookReferencePattern = new RegExp('\\b(' + escapedBookNames + ')\\s+(\\d{1,3})\\s*:\\s*(\\d{1,3})(?:\\s*[-–—]\\s*(\\d{1,3}))?', 'gi');
                    let match;
                    while ((match = bookReferencePattern.exec(blockText)) && references.length < 12) {
                        const end = bookReferencePattern.lastIndex;
                        const rangeText = match[2] + ':' + match[3] + (match[4] ? '-' + match[4] : '');
                        const parsed = this.parseOutlineTraceRange(rangeText, chapterNumber);
                        const matchesPassage = Boolean(packet && studyBookKey &&
                            normalizeBook(match[1]) === studyBookKey && parsed &&
                            parsed.chapter === chapterNumber);
                        references.push({
                            text: match[0],
                            matchesPassage,
                            range: matchesPassage ? parsed : null
                        });
                        occupiedSpans.push({ start: match.index, end });
                        if (matchesPassage) passageRanges.push(parsed);
                    }

                    const unprefixedReferencePattern = /\b(\d{1,3})\s*:\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?|\b(?:vv?\.?|verses?)\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?/gi;
                    while ((match = unprefixedReferencePattern.exec(blockText)) && references.length < 12) {
                        if (occupiedSpans.some(span => match.index >= span.start && match.index < span.end)) continue;
                        const rawReference = match[0].trim();
                        const precedingText = blockText.slice(Math.max(0, match.index - 18), match.index);
                        const abbreviatedBookPrefix = precedingText.match(/\b[A-Za-z][A-Za-z.'’]{0,9}\.\s*$/);
                        if (abbreviatedBookPrefix) {
                            references.push({ text: abbreviatedBookPrefix[0].trim() + ' ' + rawReference, matchesPassage: false, range: null });
                            continue;
                        }
                        const parsed = this.parseOutlineTraceRange(rawReference, chapterNumber);
                        const matchesPassage = Boolean(packet && parsed && chapterNumber && parsed.chapter === chapterNumber);
                        references.push({
                            text: rawReference,
                            matchesPassage,
                            range: matchesPassage ? parsed : null
                        });
                        if (matchesPassage) passageRanges.push(parsed);
                    }
                    return { references, passageRanges };
                };

                const getValidOutlineRange = reference => {
                    const referenceText = String(reference || '').trim();
                    const parsed = this.parseOutlineTraceRange(referenceText, chapterNumber);
                    const bookPrefix = referenceText.match(/^(.+?)\s+\d{1,3}\s*:/);
                    const bookMatches = !bookPrefix || normalizeBook(bookPrefix[1]) === studyBookKey;
                    return packet && parsed && chapterNumber && parsed.chapter === chapterNumber && bookMatches ? parsed : null;
                };

                const maxClaimsPerParagraph = 8;
                const maxSentenceClaims = 120;
                let sentenceClaimsShown = 0;
                const blocksToReview = blocks.slice(0, maxClaimReviewBlocks);
                const allRows = blocksToReview.map((block, blockIndex) => {
                    const referenceAnalysis = getReferenceAnalysis(block.text);
                    const references = referenceAnalysis.references.map(reference => ({
                        ...reference,
                        source: 'paragraph'
                    }));
                    const passageRanges = referenceAnalysis.passageRanges.slice();
                    let headingReferenceInherited = false;
                    const headingAnalysis = block.heading
                        ? getReferenceAnalysis(block.heading)
                        : { references: [], passageRanges: [] };

                    // Inherit an explicit section-heading reference only when the paragraph
                    // has no reference of its own. A paragraph citing another book/chapter
                    // must not be linked automatically to its enclosing heading's passage.
                    if (!references.length && block.heading) {
                        headingAnalysis.references.forEach(reference => {
                            references.push({ ...reference, source: 'section heading' });
                        });
                        headingAnalysis.passageRanges.forEach(range => {
                            if (!passageRanges.some(existing => this.outlineTraceRangesOverlap(existing, range))) {
                                passageRanges.push(range);
                            }
                        });
                        headingReferenceInherited = headingAnalysis.references.length > 0;
                    }
                    const outlineLinks = (Array.isArray(outlinePoints) ? outlinePoints : []).filter(point => {
                        const pointRange = getValidOutlineRange(point.reference);
                        return pointRange && passageRanges.some(range => this.outlineTraceRangesOverlap(range, pointRange));
                    }).slice(0, 3).map(point => ({
                        index: point.index,
                        label: 'Point ' + point.index + ': ' + (point.statement || '[statement missing]') +
                            ' (' + (point.reference || '[verse reference missing]') + ')'
                    }));
                    const sourceDivisions = packet && packet.passageOutline && Array.isArray(packet.passageOutline.sections)
                        ? packet.passageOutline.sections : [];
                    const divisionLinks = sourceDivisions.filter(row => {
                        const sourceRange = this.parseOutlineTraceRange(row && row.verseRange, chapterNumber);
                        return sourceRange && chapterNumber && sourceRange.chapter === chapterNumber &&
                            passageRanges.some(range => this.outlineTraceRangesOverlap(range, sourceRange));
                    }).slice(0, 3).map(row => ({
                        label: (row.verseRange || '[verse range missing]') + ' — ' +
                            (row.heading || row.majorIdea || '[division title missing]')
                    }));

                    const sentenceTexts = this.splitManuscriptClaimSentences(block.text);
                    const sentencesAllowed = Math.max(0, Math.min(maxClaimsPerParagraph, maxSentenceClaims - sentenceClaimsShown));
                    const visibleSentenceTexts = sentenceTexts.slice(0, sentencesAllowed);
                    let nextClaimIndex = 0;
                    const sentenceClaims = visibleSentenceTexts.map((sentenceText, sentenceIndex) => {
                        const claimAnalysis = this.extractManuscriptClaimProposition(sentenceText);
                        const sentenceAnalysis = getReferenceAnalysis(sentenceText);
                        let claimReferences = sentenceAnalysis.references.map(reference => ({
                            ...reference,
                            source: 'sentence'
                        }));
                        let claimPassageRanges = sentenceAnalysis.passageRanges.slice();
                        let inheritedFrom = '';

                        if (!claimReferences.length && referenceAnalysis.references.length) {
                            claimReferences = referenceAnalysis.references.map(reference => ({
                                ...reference,
                                source: 'paragraph context'
                            }));
                            claimPassageRanges = referenceAnalysis.passageRanges.slice();
                            inheritedFrom = 'paragraph context';
                        } else if (!claimReferences.length && headingAnalysis.references.length) {
                            claimReferences = headingAnalysis.references.map(reference => ({
                                ...reference,
                                source: 'section heading'
                            }));
                            claimPassageRanges = headingAnalysis.passageRanges.slice();
                            inheritedFrom = 'section heading';
                        }

                        const claimOutlineLinks = (Array.isArray(outlinePoints) ? outlinePoints : []).filter(point => {
                            const pointRange = getValidOutlineRange(point.reference);
                            return pointRange && claimPassageRanges.some(range => this.outlineTraceRangesOverlap(range, pointRange));
                        }).slice(0, 2).map(point => ({
                            index: point.index,
                            label: 'Point ' + point.index + ': ' + (point.statement || '[statement missing]') +
                                ' (' + (point.reference || '[verse reference missing]') + ')'
                        }));
                        const claimDivisionLinks = sourceDivisions.filter(row => {
                            const sourceRange = this.parseOutlineTraceRange(row && row.verseRange, chapterNumber);
                            return sourceRange && chapterNumber && sourceRange.chapter === chapterNumber &&
                                claimPassageRanges.some(range => this.outlineTraceRangesOverlap(range, sourceRange));
                        }).slice(0, 2).map(row => ({
                            label: (row.verseRange || '[verse range missing]') + ' — ' +
                                (row.heading || row.majorIdea || '[division title missing]')
                        }));

                        const claimFlags = [];
                        if (claimAnalysis.kind === 'context') {
                            // Greetings, directions and transitions are not treated as claims.
                        } else {
                            if (claimAnalysis.kind === 'unresolved' || claimAnalysis.kind === 'quotation') {
                                claimFlags.push(claimAnalysis.note);
                            }
                            if (!packet) {
                                claimFlags.push('No imported IBS packet; check this candidate claim manually');
                            } else if (!claimReferences.length) {
                                claimFlags.push('No sentence or inherited passage reference detected');
                            } else if (!claimPassageRanges.length) {
                                claimFlags.push('Reference does not clearly match the imported book/chapter');
                            }
                            if (inheritedFrom === 'paragraph context') {
                                claimFlags.push('Reference is inherited from the paragraph context; confirm that it supports this proposition');
                            } else if (inheritedFrom === 'section heading') {
                                claimFlags.push('Reference is inherited from the section heading; confirm this proposition belongs within that verse range');
                            }
                            if (claimPassageRanges.length && !claimOutlineLinks.length) {
                                claimFlags.push('No overlapping outline point found for this proposition reference');
                            }
                            if (/\b(God|Jesus|Christ|Lord|Holy Spirit|Spirit|salvation|sin|faith|grace|redemption|gospel|righteousness|justification|judgment|divine|doctrine|repentance)\b/i.test(claimAnalysis.proposition || sentenceText)) {
                                claimFlags.push('Possible theological claim — compare with IBS Doctrine and the passage');
                            }
                            if (/\b(?:1[5-9]\d{2}|20\d{2}|A\.?D\.?|B\.?C\.?|historically|historian|archaeolog\w*|research (?:shows|suggests)|studies show|scholars? (?:say|argue|agree)|traditionally|Roman empire|Roman law)\b/i.test(claimAnalysis.proposition || sentenceText)) {
                                claimFlags.push('Possible factual / historical detail — verify a reliable source or citation');
                            }
                            if (/[“”‘’"]/.test(sentenceText) || /\b(?:said|says|according to|quoted|quotation)\b/i.test(sentenceText)) {
                                claimFlags.push('Quotation or attribution — verify exact wording and source');
                            }
                            if (/\b(?:should|must|ought to|respond|repent|forgive|obey|trust|follow|apply|application|let us|today)\b/i.test(claimAnalysis.proposition || sentenceText) ||
                                /application|response|discipleship/i.test(block.section)) {
                                claimFlags.push('Application / response claim — compare with IBS Discipleship and the sermon aim');
                            }
                        }

                        return {
                            index: sentenceIndex + 1,
                            claimIndex: claimAnalysis.kind === 'claim' ? ++nextClaimIndex : null,
                            kind: claimAnalysis.kind,
                            proposition: claimAnalysis.proposition,
                            note: claimAnalysis.note,
                            references: claimReferences.slice(0, 4).map(reference => ({
                                text: reference.text,
                                matchesPassage: reference.matchesPassage,
                                source: reference.source || 'sentence'
                            })),
                            outlineLinks: claimOutlineLinks,
                            divisionLinks: claimDivisionLinks,
                            flags: claimFlags.slice(0, 6)
                        };
                    });
                    sentenceClaimsShown += sentenceClaims.length;

                    const flags = [];
                    if (!packet) flags.push('No imported IBS packet; source links require manual review');
                    if (!references.length) {
                        flags.push('No explicit passage reference detected; verify the paragraph connection to the passage and outline');
                    } else if (headingReferenceInherited) {
                        flags.push('Passage reference inherited from the section heading — confirm this paragraph belongs within that verse range');
                    }
                    if (references.length && !passageRanges.length) {
                        flags.push('Cited reference does not clearly match the imported book/chapter; verify it manually');
                    } else if (!outlineLinks.length) {
                        flags.push('No overlapping outline point found for the detected passage range; review the fit');
                    }
                    if (/\b(God|Jesus|Christ|Lord|Holy Spirit|Spirit|salvation|sin|faith|grace|redemption|gospel|righteousness|justification|judgment|divine|doctrine|repentance)\b/i.test(block.text)) {
                        flags.push('Possible theological claim — compare with IBS Doctrine and the passage');
                    }
                    if (/\b(?:1[5-9]\d{2}|20\d{2}|A\.?D\.?|B\.?C\.?|historically|historian|archaeolog\w*|research (?:shows|suggests)|studies show|scholars? (?:say|argue|agree)|traditionally|Roman empire|Roman law)\b/i.test(block.text)) {
                        flags.push('Possible factual / historical detail — verify a reliable source or citation');
                    }
                    if (/[“”‘’"]/.test(block.text) || /\b(?:said|says|according to|quoted|quotation)\b/i.test(block.text)) {
                        flags.push('Quotation or attribution — verify exact wording and source');
                    }
                    if (/\b(?:should|must|ought to|respond|repent|forgive|obey|trust|follow|apply|application|let us|today)\b/i.test(block.text) ||
                        /application|response|discipleship/i.test(block.section)) {
                        flags.push('Application / response claim — compare with IBS Discipleship and the sermon aim');
                    }

                    return {
                        index: blockIndex + 1,
                        section: block.section,
                        excerpt: block.text.slice(0, maxClaimExcerptCharacters) +
                            (block.text.length > maxClaimExcerptCharacters ? ' … [excerpt trimmed]' : ''),
                        references: references.slice(0, 5).map(reference => ({
                            text: reference.text,
                            matchesPassage: reference.matchesPassage,
                            source: reference.source || 'paragraph'
                        })),
                        headingReferenceInherited,
                        passageRanges,
                        outlineLinks,
                        divisionLinks,
                        flags,
                        claims: sentenceClaims,
                        totalClaims: sentenceTexts.length,
                        derivedClaimCount: nextClaimIndex,
                        nonClaimCount: sentenceClaims.length - nextClaimIndex,
                        omittedClaims: Math.max(0, sentenceTexts.length - sentenceClaims.length)
                    };
                });

                const totalSentenceCount = allRows.reduce((total, row) => total + row.totalClaims, 0);
                const omittedSentenceCount = allRows.reduce((total, row) => total + row.omittedClaims, 0);
                const derivedClaimCount = allRows.reduce((total, row) => total + row.derivedClaimCount, 0);
                const nonClaimSentenceCount = allRows.reduce((total, row) => total + row.nonClaimCount, 0);
                return {
                    rows: allRows,
                    totalCount: blocks.length,
                    omittedCount: Math.max(0, blocks.length - allRows.length),
                    totalSentenceCount,
                    visibleSentenceCount: sentenceClaimsShown,
                    derivedClaimCount,
                    nonClaimSentenceCount,
                    omittedSentenceCount,
                    inputTruncated: source.length > analysisSource.length
                };
            }

                parseOutlineTraceRange(reference, defaultChapter) {
                const text = typeof reference === 'string' ? reference.trim() : '';
                if (!text) return null;
                let match = text.match(/\b(\d{1,3})\s*:\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?/);
                let chapter = Number(defaultChapter) || null;
                let start = null;
                let end = null;
                if (match) {
                    chapter = Number(match[1]);
                    start = Number(match[2]);
                    end = match[3] ? Number(match[3]) : start;
                } else {
                    match = text.match(/\b(?:vv?\.?|verses?)\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?/i);
                    if (!match && /^\s*\d{1,3}(?:\s*[-–—]\s*\d{1,3})?\s*$/.test(text)) {
                        match = text.match(/^\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?\s*$/);
                    }
                    if (!match) return null;
                    start = Number(match[1]);
                    end = match[2] ? Number(match[2]) : start;
                }
                if (!chapter || !start || !end || start < 1 || end < start || end > 250) return null;
                return { chapter, start, end };
            }

                outlineTraceRangesOverlap(a, b) {
                return Boolean(a && b && a.chapter === b.chapter && a.start <= b.end && b.start <= a.end);
            }

                outlineTraceNotesForRange(notes, range, defaultChapter) {
                const blocks = String(notes || '').split(/\n\s*\n|\r?\n/).map(block => block.trim()).filter(Boolean);
                const overlapsExplicitRef = block => {
                    const pattern = /\b(\d{1,3})\s*:\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?|\b(?:vv?\.?|verses?)\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?/gi;
                    let match;
                    while ((match = pattern.exec(block))) {
                        const chapter = match[1] ? Number(match[1]) : Number(defaultChapter);
                        const start = Number(match[1] ? match[2] : match[4]);
                        const end = Number(match[1] ? (match[3] || match[2]) : (match[5] || match[4]));
                        if (this.outlineTraceRangesOverlap(range, { chapter, start, end })) return true;
                    }
                    return false;
                };
                return blocks.filter(overlapsExplicitRef).slice(0, 3);
            }
  }

  return { ClaimReviewEngine };
});
