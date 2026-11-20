(function () {
  'use strict';

  const Data = window.KerygmaRebuildData;
  const root = document.getElementById('kerygma-rebuild-root');
  if (!Data || !root) return;

  const state = {
    sermons: Data.sortRecentSermons(Data.readLocalSermons(window.localStorage)),
    query: '',
    selectedId: ''
  };
  state.selectedId = state.sermons[0] ? state.sermons[0].id : '';

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function link(label, href, className) {
    const anchor = element('a', className, label);
    anchor.href = href;
    return anchor;
  }

  function dateLabel(sermon) {
    const date = Date.parse(sermon.updatedAt || sermon.createdAt || '');
    if (!Number.isFinite(date) || date <= 0) return 'Date not recorded';
    return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date));
  }

  function stageStateLabel(stateName) {
    if (stateName === 'complete') return 'Recorded';
    if (stateName === 'in-progress') return 'In progress';
    return 'Not started';
  }

  function makeStageTrack(sermon) {
    const stages = Data.getStageProgress(sermon);
    const track = element('div', 'stage-track');
    stages.forEach((stage, index) => {
      const item = element('div', 'stage-track-item stage-' + stage.state);
      const number = element('span', 'stage-track-number', String(index + 1).padStart(2, '0'));
      const title = element('span', 'stage-track-title', stage.shortLabel);
      const status = element('span', 'stage-track-status', stageStateLabel(stage.state));
      item.append(number, title, status);
      track.appendChild(item);
    });
    return track;
  }

  function makeSermonCard(sermon) {
    const source = Data.getSourceSummary(sermon);
    const progress = Data.getStageProgress(sermon);
    const completed = progress.filter(stage => stage.state === 'complete').length;
    const inProgress = progress.filter(stage => stage.state === 'in-progress').length;
    const card = element('article', 'sermon-card');
    const button = element('button', 'sermon-card-main');
    button.type = 'button';
    button.addEventListener('click', () => {
      state.selectedId = sermon.id;
      render();
    });
    const heading = element('div', 'sermon-card-heading');
    const titleGroup = element('div', 'sermon-card-title-group');
    titleGroup.append(element('h3', '', sermon.title), element('p', '', sermon.passage || 'Passage not set'));
    const meta = element('span', 'sermon-card-date', dateLabel(sermon));
    heading.append(titleGroup, meta);
    const footer = element('div', 'sermon-card-footer');
    const progressLabel = element('span', 'sermon-progress-label', completed + ' of 5 stages recorded');
    const sourceLabel = element('span', source.attached ? 'source-pill attached' : 'source-pill', source.attached ? 'IBS study attached' : 'No IBS source');
    footer.append(progressLabel, sourceLabel);
    button.append(heading, footer);
    card.appendChild(button);
    if (state.selectedId === sermon.id) card.classList.add('is-selected');
    return card;
  }

  function makeSelectedSermon(sermon) {
    const panel = element('section', 'selected-sermon-panel');
    panel.append(element('p', 'section-eyebrow', 'SELECTED SERMON'));
    if (!sermon) {
      panel.append(element('h2', '', 'No sermon selected'));
      panel.append(element('p', 'muted-copy', 'Create or open a sermon in the current Kerygma Studio. This preview does not create records.'));
      panel.append(link('Open current Kerygma', '/sermon/index.html', 'button button-primary'));
      return panel;
    }

    const source = Data.getSourceSummary(sermon);
    const progress = Data.getStageProgress(sermon);
    panel.append(element('h2', '', sermon.title));
    panel.append(element('p', 'selected-passage', sermon.passage || 'Passage not set'));
    const status = element('div', 'selected-status-row');
    status.append(
      element('span', source.attached ? 'source-pill attached' : 'source-pill', source.attached ? 'IBS source attached' : 'No IBS source'),
      element('span', 'selected-updated', 'Updated ' + dateLabel(sermon))
    );
    panel.appendChild(status);
    if (source.attached) {
      const sourceText = source.passage ? 'Source study: ' + source.passage : 'Source Inductive Study is attached.';
      panel.append(element('p', 'source-summary-copy', sourceText + ' ' + source.stageCount + ' of 4 study stages contain notes.'));
    } else {
      panel.append(element('p', 'source-summary-copy', 'Attach an exported IBS study in the current Kerygma Studio when the passage study is ready.'));
    }
    panel.append(element('h3', 'subsection-heading', 'Development progress'));
    panel.appendChild(makeStageTrack(sermon));
    const actionRow = element('div', 'selected-actions');
    actionRow.append(link('Open in current Kerygma', '/sermon/index.html', 'button button-primary'));
    actionRow.append(link('Return to IBS', '/', 'button button-secondary'));
    panel.appendChild(actionRow);
    return panel;
  }

  function render() {
    const filtered = Data.filterSermons(state.sermons, state.query);
    const selected = state.sermons.find(sermon => sermon.id === state.selectedId) || filtered[0] || null;
    if (selected && selected.id !== state.selectedId) state.selectedId = selected.id;

    root.replaceChildren();
    const shell = element('div', 'app-shell');

    const header = element('header', 'topbar');
    const brand = element('a', 'brand', '');
    brand.href = '/sermon-preview/index.html';
    const brandMark = element('span', 'brand-mark', 'K');
    const brandText = element('span', 'brand-text');
    brandText.append(element('strong', '', 'Kerygma'), element('small', '', 'Expository Sermon Studio'));
    brand.append(brandMark, brandText);
    const headerActions = element('nav', 'topbar-actions');
    headerActions.setAttribute('aria-label', 'Workspace links');
    headerActions.append(
      element('span', 'preview-label', 'REBUILD PREVIEW · READ ONLY'),
      link('IBS Workspace', '/', 'topbar-link'),
      link('Current studio', '/sermon/index.html', 'topbar-primary')
    );
    header.append(brand, headerActions);

    const frame = element('div', 'workspace-frame');
    const sidebar = element('aside', 'sidebar');
    sidebar.append(element('p', 'sidebar-eyebrow', 'WORKSPACE'));
    sidebar.append(element('h1', 'sidebar-heading', 'Sermon library'));
    sidebar.append(element('p', 'sidebar-copy', 'Your existing browser sermons, displayed without changing them.'));

    const searchWrap = element('label', 'search-wrap');
    searchWrap.append(element('span', 'search-label', 'Search sermons'));
    const search = element('input', 'sermon-search');
    search.type = 'search';
    search.placeholder = 'Title, passage or content…';
    search.value = state.query;
    search.addEventListener('input', event => {
      state.query = event.target.value;
      const filtered = Data.filterSermons(state.sermons, state.query);
      if (!filtered.some(row => row.id === state.selectedId)) state.selectedId = filtered[0] ? filtered[0].id : '';
      render();
      const nextSearch = root.querySelector('.sermon-search');
      if (nextSearch) {
        nextSearch.focus();
        nextSearch.setSelectionRange(state.query.length, state.query.length);
      }
    });
    searchWrap.appendChild(search);
    sidebar.appendChild(searchWrap);

    const listHeading = element('div', 'sidebar-list-heading');
    listHeading.append(element('span', '', 'SAVED SERMONS'), element('span', 'count-pill', String(filtered.length)));
    sidebar.appendChild(listHeading);
    const list = element('div', 'sermon-list');
    if (!filtered.length) {
      list.appendChild(element('p', 'empty-list', state.sermons.length ? 'No sermons match this search.' : 'No browser-local sermons were found. Open the current studio to load your saved sermon vault.'));
    } else {
      filtered.forEach(sermon => list.appendChild(makeSermonCard(sermon)));
    }
    sidebar.appendChild(list);

    const sidebarFooter = element('div', 'sidebar-footer');
    sidebarFooter.append(
      element('span', 'safe-indicator', '●'),
      element('span', '', 'Existing storage is read only in this preview.')
    );
    sidebar.appendChild(sidebarFooter);

    const main = element('main', 'main-workspace');
    const intro = element('section', 'workspace-intro');
    const introCopy = element('div', 'workspace-intro-copy');
    introCopy.append(
      element('p', 'section-eyebrow', 'EXPOSITORY SERMON PREPARATION'),
      element('h2', '', 'From the biblical text to faithful proclamation.'),
      element('p', '', 'A connected workspace for exegesis, the Big Idea, the homiletical outline, application and the sermon manuscript.')
    );
    const introActions = element('div', 'intro-actions');
    introActions.append(
      link('Open current Kerygma', '/sermon/index.html', 'button button-primary'),
      link('Open IBS Workspace', '/', 'button button-secondary')
    );
    intro.append(introCopy, introActions);
    main.appendChild(intro);

    const stats = Data.deriveDashboardStats(state.sermons);
    const statsGrid = element('section', 'stats-grid');
    statsGrid.setAttribute('aria-label', 'Sermon library summary');
    [
      ['Saved sermons', stats.total, 'Existing records in this browser'],
      ['IBS studies attached', stats.withInductiveSource, 'Source packets on saved sermons'],
      ['Outlines recorded', stats.withOutline, 'Sermons with homiletical points'],
      ['Manuscripts started', stats.withManuscript, 'Sermons with manuscript notes']
    ].forEach(([label, value, note]) => {
      const card = element('article', 'stat-card');
      card.append(element('span', 'stat-label', label), element('strong', 'stat-value', String(value)), element('span', 'stat-note', note));
      statsGrid.appendChild(card);
    });
    main.appendChild(statsGrid);

    const contentGrid = element('div', 'content-grid');
    const recentPanel = element('section', 'recent-panel');
    const recentHeader = element('div', 'panel-heading');
    recentHeader.append(element('div', '', ''));
    recentHeader.firstChild.append(element('p', 'section-eyebrow', 'YOUR WORKSPACE'), element('h2', '', 'Recent sermons'));
    recentHeader.append(element('span', 'muted-meta', String(filtered.length) + ' shown'));
    recentPanel.appendChild(recentHeader);

    if (!filtered.length) {
      const empty = element('div', 'empty-state');
      empty.append(
        element('h3', '', state.sermons.length ? 'No results found' : 'Your sermon workspace is ready'),
        element('p', '', state.sermons.length ? 'Try another title, passage or phrase from the sermon notes.' : 'No existing browser-local records were changed or created. Your current cloud-backed studio remains available.'),
        link('Open current Kerygma', '/sermon/index.html', 'button button-primary')
      );
      recentPanel.appendChild(empty);
    } else {
      const cards = element('div', 'recent-cards');
      filtered.slice(0, 5).forEach(sermon => cards.appendChild(makeSermonCard(sermon)));
      recentPanel.appendChild(cards);
    }

    const selected = state.sermons.find(sermon => sermon.id === state.selectedId) || filtered[0] || null;
    contentGrid.append(recentPanel, makeSelectedSermon(selected));
    main.appendChild(contentGrid);

    const workflow = element('section', 'workflow-panel');
    workflow.append(
      element('p', 'section-eyebrow', 'THE SERMON WORKFLOW'),
      element('h2', '', 'Five connected stages')
    );
    const stageGrid = element('div', 'workflow-grid');
    Data.WORKFLOW_STAGES.forEach((stage, index) => {
      const card = element('article', 'workflow-step');
      card.append(
        element('span', 'workflow-number', '0' + (index + 1)),
        element('h3', '', stage.label),
        element('p', '', [
          'Establish the text, literary setting and exegetical observations.',
          'Formulate the central exegetical idea and homiletical proposition.',
          'Develop a clear sermon structure that follows the passage.',
          'Prepare text-grounded illustrations and audience-aware application.',
          'Bring the sermon together in a coherent, editable manuscript.'
        ][index])
      );
      stageGrid.appendChild(card);
    });
    workflow.appendChild(stageGrid);
    main.appendChild(workflow);

    shell.append(header, frame);
    frame.append(sidebar, main);
    root.appendChild(shell);
  }

  render();
})();
