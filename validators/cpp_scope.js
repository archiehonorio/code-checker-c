// validators/cpp_scope.js
// ---------------------------------------------------------------------------
// Shared structural pass. This is what lets the checker "understand" code
// instead of pattern-matching lines: it removes the noise (string/char
// literals and comments) that corrupts brace counting, then records, for
// every line, the stack of enclosing blocks and the header that opened each
// one (e.g. "if(idx > -1)", "for(int i=0; i<=docs->itemNum; i++)").
//
// Validators use this to answer real questions:
//   - "is this access inside an if(obj->descNum > -1) block?"
//   - "is this delete in the same/ancestor block as this return?"
//   - "was this pointer declared locally, or is it a class member?"
//
// Pure, deterministic, runs in the browser. No external calls.
// ---------------------------------------------------------------------------

window.CppScope = (function () {

  // Replace string/char literal contents and comments with spaces, preserving
  // line length and structure so column/brace logic stays valid.
  function sanitize(lines) {
    const out = [];
    let inBlock = false;
    for (let i = 0; i < lines.length; i++) {
      const src = lines[i];
      let res = '';
      let j = 0;
      while (j < src.length) {
        const c = src[j], n = src[j + 1];
        if (inBlock) {
          if (c === '*' && n === '/') { res += '  '; j += 2; inBlock = false; }
          else { res += ' '; j++; }
          continue;
        }
        if (c === '/' && n === '/') { while (j < src.length) { res += ' '; j++; } break; }
        if (c === '/' && n === '*') { res += '  '; j += 2; inBlock = true; continue; }
        if (c === '"' || c === "'") {
          const q = c; res += q; j++;
          while (j < src.length) {
            if (src[j] === '\\') { res += '  '; j += 2; continue; }
            if (src[j] === q) { res += q; j++; break; }
            res += ' '; j++;
          }
          continue;
        }
        res += c; j++;
      }
      out.push(res);
    }
    return out;
  }

  // For each line, the list of open blocks (innermost last), each as
  // { open: <lineIndex>, header: <text that preceded the '{'> }.
  // Also returns bracelessControl[i]: the header of a braceless if/for/while
  // whose single controlled statement is line i (else null).
  function analyze(lines) {
    const code = sanitize(lines);
    const enclosers = lines.map(() => []);
    const bracelessControl = lines.map(() => null);

    const stack = [];
    let pending = '';           // text accumulating toward the next '{' or ';'
    let parenDepth = 0;         // ';' only separates statements outside parens

    // Track a braceless control header waiting for its single statement.
    let danglingControl = null; // { header } applies to the next statement line

    for (let i = 0; i < code.length; i++) {
      // snapshot enclosers at start of this line
      enclosers[i] = stack.map(s => ({ open: s.open, header: s.header }));

      const line = code[i];
      const trimmed = line.trim();

      // assign a pending braceless control to this line if one is waiting
      if (danglingControl && trimmed.length > 0) {
        bracelessControl[i] = danglingControl.header;
        danglingControl = null;
      }

      for (let k = 0; k < line.length; k++) {
        const ch = line[k];
        if (ch === '(') { parenDepth++; pending += ch; }
        else if (ch === ')') { if (parenDepth > 0) parenDepth--; pending += ch; }
        else if (ch === '{') {
          stack.push({ open: i, header: pending.trim().replace(/\s+/g, ' ') });
          pending = '';
        } else if (ch === '}') {
          if (stack.length) stack.pop();
          pending = '';
        } else if (ch === ';' && parenDepth === 0) {
          pending = '';
        } else {
          pending += ch;
        }
      }

      // Detect a braceless control: line is exactly an if/for/while(...) with
      // nothing after the ')' and the NEXT line has no '{'. We mark the header
      // and apply it to the next non-empty line (handled at top of loop).
      const ctrl = trimmed.match(/^(if|for|while)\s*\(.*\)\s*$/);
      if (ctrl && !line.includes('{')) {
        // only if the matched '(' ... ')' is balanced on this line
        const opens = (trimmed.match(/\(/g) || []).length;
        const closes = (trimmed.match(/\)/g) || []).length;
        if (opens === closes) danglingControl = { header: trimmed };
      }
    }

    return { code, enclosers, bracelessControl };
  }

  // Does any enclosing block header (or a braceless control) of line i match re?
  function guardedBy(info, i, re) {
    for (const e of info.enclosers[i]) if (re.test(e.header)) return true;
    if (info.bracelessControl[i] && re.test(info.bracelessControl[i])) return true;
    return false;
  }

  // Is delete-line D in the same block or an ancestor block of return-line R?
  // (i.e. D's open-brace stack is a prefix of R's, and D is textually before R)
  function coversPath(info, D, R) {
    if (D >= R) return false;
    const ed = info.enclosers[D], er = info.enclosers[R];
    if (ed.length > er.length) return false;
    for (let k = 0; k < ed.length; k++) if (ed[k].open !== er[k].open) return false;
    return true;
  }

  return { sanitize, analyze, guardedBy, coversPath };
})();
