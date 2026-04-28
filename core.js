window.validators = [];

// ── Helpers ────────────────────────────────────────────────────────────────

function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function highlightBraces(line) {
  line = escapeHtml(line);
  const patterns = [
    { regex: /(\{)/g, cls: 'brace' },
    { regex: /(\})/g, cls: 'brace' },
    { regex: /(\()/g, cls: 'paren' },
    { regex: /(\))/g, cls: 'paren' },
    { regex: /(\[)/g, cls: 'bracket' },
    { regex: /(\])/g, cls: 'bracket' },
  ];
  patterns.forEach(p => { line = line.replace(p.regex, `<span class="${p.cls}">$1</span>`); });
  return line;
}

// ── Preview ────────────────────────────────────────────────────────────────

function makePreview(lines) {
  const preview = document.getElementById('preview');
  preview.innerHTML = '';
  lines.forEach((text, i) => {
    const row = document.createElement('div');
    row.className = 'line';
    row.id = 'L' + (i + 1);

    const num = document.createElement('span');
    num.className = 'ln';
    num.textContent = String(i + 1).padStart(4, ' ') + ' ';

    const txt = document.createElement('span');
    txt.innerHTML = highlightBraces(text);

    row.appendChild(num);
    row.appendChild(txt);
    preview.appendChild(row);
  });
}

function jumpToLine(lineNo) {
  document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
  const el = document.getElementById('L' + lineNo);
  if (el) {
    el.classList.add('highlight');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// ── Analysis ───────────────────────────────────────────────────────────────

function analyze(raw) {
  const lines = raw.split('\n');
  const issues = [];
  const ctx = {};
  window.validators.forEach(fn => {
    try { fn(lines, raw, issues, ctx); } catch (e) { console.error(e); }
  });
  // Stable sort: errors first, then warnings, then suggestions; preserve order within group
  const order = { error: 0, warning: 1, suggestion: 2 };
  issues.sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3) || a.line - b.line);
  return { issues, lines };
}

// ── Verdict ────────────────────────────────────────────────────────────────

function buildVerdict(issues) {
  const errCount  = issues.filter(i => i.severity === 'error').length;
  const warnCount = issues.filter(i => i.severity === 'warning').length;
  const suggCount = issues.filter(i => i.severity === 'suggestion').length;

  const bar = document.getElementById('verdict-bar');
  bar.style.display = 'block';

  let verdictHtml;
  if (errCount > 0) {
    verdictHtml = `<span class="verdict verdict-risky">&#9888; RISKY — do not deploy until errors are resolved</span>`;
  } else if (warnCount > 0) {
    verdictHtml = `<span class="verdict verdict-caution">&#9651; CAUTION — warnings should be reviewed</span>`;
  } else if (issues.length === 0) {
    verdictHtml = `<span class="verdict verdict-safe">&#10003; SAFE — no issues detected</span>`;
  } else {
    verdictHtml = `<span class="verdict verdict-safe">&#10003; SAFE — suggestions only</span>`;
  }

  const badgeParts = [];
  if (errCount  > 0) badgeParts.push(`<span class="count-badge count-err">${errCount} Error${errCount  !== 1 ? 's' : ''}</span>`);
  if (warnCount > 0) badgeParts.push(`<span class="count-badge count-warn">${warnCount} Warning${warnCount !== 1 ? 's' : ''}</span>`);
  if (suggCount > 0) badgeParts.push(`<span class="count-badge count-info">${suggCount} Suggestion${suggCount !== 1 ? 's' : ''}</span>`);
  if (issues.length === 0) badgeParts.push(`<span class="count-badge count-ok">All checks passed</span>`);

  bar.innerHTML = verdictHtml + `<div class="counts">${badgeParts.join('')}</div>`;
}

// ── Filter bar ─────────────────────────────────────────────────────────────

let activeFilter = 'all';

function buildFilterBar(issues) {
  const fb = document.getElementById('filter-bar');
  fb.style.display = issues.length > 0 ? 'flex' : 'none';
}

function applyFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll('.flt').forEach(btn => {
    btn.className = 'flt';
    if (btn.dataset.filter === filter) {
      const map = { all: 'active-all', error: 'active-err', warning: 'active-warn', suggestion: 'active-info' };
      btn.classList.add(map[filter] || 'active-all');
    }
  });
  document.querySelectorAll('.issue').forEach(card => {
    const sev = card.dataset.severity;
    card.style.display = (filter === 'all' || sev === filter) ? '' : 'none';
  });
}

// ── Render issues ──────────────────────────────────────────────────────────

function renderIssues(issues) {
  const container = document.getElementById('issues');
  container.innerHTML = '';

  if (issues.length === 0) {
    const ok = document.createElement('div');
    ok.className = 'issue sev-ok';
    ok.innerHTML = `<div class="issue-top"><span class="issue-type">&#10003; No issues found — code looks good!</span></div>`;
    container.appendChild(ok);
    return;
  }

  const sevLabel = { error: 'Error', warning: 'Warning', suggestion: 'Suggestion' };
  const sevBadge = { error: 'badge-error', warning: 'badge-warning', suggestion: 'badge-suggestion' };

  issues.forEach(it => {
    const sev = it.severity || 'warning';
    const card = document.createElement('div');
    card.className = `issue sev-${sev}`;
    card.dataset.severity = sev;

    const topRow = document.createElement('div');
    topRow.className = 'issue-top';

    const badge = document.createElement('span');
    badge.className = `issue-badge ${sevBadge[sev] || 'badge-warning'}`;
    badge.textContent = sevLabel[sev] || sev;

    const ruleSpan = it.rule ? (() => { const s = document.createElement('span'); s.className = 'issue-rule'; s.textContent = '[' + it.rule + ']'; return s; })() : null;

    const typeSpan = document.createElement('span');
    typeSpan.className = 'issue-type';
    typeSpan.textContent = it.type || 'Issue';

    topRow.appendChild(badge);
    if (ruleSpan) topRow.appendChild(ruleSpan);
    topRow.appendChild(typeSpan);

    const meta = document.createElement('div');
    meta.className = 'issue-meta';
    meta.textContent = it.line ? 'Line ' + it.line : '';

    card.appendChild(topRow);
    card.appendChild(meta);

    if (it.snippet && it.snippet.trim()) {
      const snip = document.createElement('div');
      snip.className = 'issue-snippet';
      snip.textContent = it.snippet.trim();
      card.appendChild(snip);
    }

    if (it.detail) {
      const det = document.createElement('div');
      det.className = 'issue-detail';
      det.textContent = it.detail;
      card.appendChild(det);
    }

    if (it.line) {
      const btn = document.createElement('button');
      btn.className = 'btn-goto';
      btn.textContent = 'Go to line ' + it.line;
      btn.addEventListener('click', () => jumpToLine(it.line));
      card.appendChild(btn);
    }

    container.appendChild(card);
  });

  // Jump to first error (or first issue if no errors)
  const first = issues.find(i => i.severity === 'error') || issues[0];
  if (first && first.line) jumpToLine(first.line);
}

// ── Render results ─────────────────────────────────────────────────────────

function renderResults(res) {
  makePreview(res.lines);
  document.getElementById('issue-count').textContent =
    res.issues.length === 0 ? 'No issues' : res.issues.length + ' issue' + (res.issues.length !== 1 ? 's' : '');

  buildVerdict(res.issues);
  buildFilterBar(res.issues);
  applyFilter('all');
  renderIssues(res.issues);
}

// ── Wiring ─────────────────────────────────────────────────────────────────

document.getElementById('run').addEventListener('click', () => {
  const raw = document.getElementById('code').value.trim();
  if (!raw) return;
  const res = analyze(raw);
  renderResults(res);
});

document.getElementById('clear').addEventListener('click', () => {
  document.getElementById('code').value = '';
  document.getElementById('preview').innerHTML = '';
  document.getElementById('issues').innerHTML = '';
  document.getElementById('issue-count').textContent = '';
  document.getElementById('verdict-bar').style.display = 'none';
  document.getElementById('filter-bar').style.display = 'none';
});

document.getElementById('filter-bar').addEventListener('click', e => {
  const btn = e.target.closest('.flt');
  if (btn) applyFilter(btn.dataset.filter);
});
