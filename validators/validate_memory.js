// validate_memory.js  [P-7]
// Tracks new/delete pairs and flags objects not deleted before return or catch.
window.validators.push(function validate_memory(lines, raw, issues, ctx) {
  const functions = [];
  let currentFunc = null;
  let blockStack = [];
  const destructorDeletes = [];
  let inDestructor = false;

  function stripComment(s) {
    const idx = s.indexOf('//');
    return idx >= 0 ? s.slice(0, idx) : s;
  }

  for (let i = 0; i < lines.length; i++) {
    const ln = stripComment(lines[i]).trim();

    // ── Destructor ──────────────────────────────────────────────────────
    if (/\bTranslation::~Translation\s*\(\s*\)/.test(ln)) {
      inDestructor = true;
      blockStack = [];
      continue;
    }
    if (inDestructor) {
      for (const ch of ln) {
        if (ch === '{') blockStack.push(1);
        else if (ch === '}') {
          blockStack.pop();
          if (blockStack.length === 0) { inDestructor = false; }
        }
      }
      const dm = ln.match(/\bdelete(\s+|\s*\[\s*\]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*;/);
      if (dm && !destructorDeletes.includes(dm[2])) destructorDeletes.push(dm[2]);
      continue;
    }

    // ── Function detection ──────────────────────────────────────────────
    const funcMatch = ln.match(/\b(?:bool|int|void|double|float|string)\s+Translation::([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
    if (funcMatch) {
      if (currentFunc) currentFunc.endLine = i;
      currentFunc = { name: funcMatch[1], startLine: i + 1, endLine: lines.length, objects: [], deletes: [] };
      functions.push(currentFunc);
      blockStack = [];
      continue;
    }
    if (!currentFunc) continue;

    // Track braces
    for (const ch of ln) {
      if (ch === '{') blockStack.push(1);
      else if (ch === '}') blockStack.pop();
    }

    // ── Object allocation (new or getDBLookupSettings) ──────────────────
    let allocMatch = ln.match(/\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*new\b/);
    if (!allocMatch) {
      allocMatch = ln.match(/\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*YB_V2Util::getDBLookupSettings\s*\(/);
    }
    if (allocMatch) {
      const name = allocMatch[1];
      if (!currentFunc.objects.includes(name)) currentFunc.objects.push(name);
    }

    // ── Delete ──────────────────────────────────────────────────────────
    const delMatch = ln.match(/\bdelete(\s+|\s*\[\s*\]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*;/);
    if (delMatch) {
      const name = delMatch[2];
      currentFunc.deletes.push(name);
      // Only remove permanently if the next non-empty/non-delete line is NOT a return
      let permanent = true;
      for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
        const next = stripComment(lines[j]).trim();
        if (!next) continue;
        if (/\bdelete(\s+|\s*\[\s*\]\s*)\w/.test(next)) continue;
        if (/\breturn\s+(EXIT_FAILURE|EXIT_SUCCESS|true|false)\b/.test(next)) permanent = false;
        break;
      }
      if (permanent) {
        const idx = currentFunc.objects.indexOf(name);
        if (idx !== -1) currentFunc.objects.splice(idx, 1);
      }
    }

    // ── Return / catch ─────────────────────────────────────────────────
    const isReturn = /\breturn\s+(EXIT_SUCCESS|EXIT_FAILURE|true|false)\s*;/.test(ln);
    const isCatch  = /^\s*catch\s*\(/.test(lines[i]);

    if (isReturn || isCatch) {
      // Objects deleted in preceding 6 lines
      const recentDeletes = [];
      for (let k = Math.max(0, i - 6); k < i; k++) {
        const dm2 = stripComment(lines[k]).match(/\bdelete(\s+|\s*\[\s*\]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*;/);
        if (dm2) recentDeletes.push(dm2[2]);
      }
      // Objects guarded by ->isError() check nearby
      const errorGuarded = [];
      for (const obj of currentFunc.objects) {
        for (let k = Math.max(0, i - 6); k <= i; k++) {
          if (new RegExp(obj + '->isError\\s*\\(\\)').test(lines[k])) { errorGuarded.push(obj); break; }
        }
      }

      currentFunc.objects.forEach(obj => {
        if (recentDeletes.includes(obj)) return;
        if (errorGuarded.includes(obj)) return;
        if (destructorDeletes.includes(obj)) return;
        issues.push({
          type:     'Missing delete before return',
          severity: 'error',
          rule:     'P-7',
          line:     i + 1,
          snippet:  lines[i].trim(),
          detail:   `Object "${obj}" (allocated in "${currentFunc.name}") is not deleted before this ${isCatch ? 'catch' : 'return'}.`
        });
      });
    }
  }
});
