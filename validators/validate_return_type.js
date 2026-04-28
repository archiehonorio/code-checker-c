// validate_return_type.js  [P-5]
// Main translate() must return EXIT_FAILURE/EXIT_SUCCESS.
// Sub-functions (bool return type) must return true/false.
window.validators.push(function validate_return_type(lines, raw, issues) {
  let scope = null; // 'main' | 'sub' | null
  let funcName = '';
  let braceDepth = 0;
  let funcStartDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^\s*\/\//.test(ln)) continue;
    const code = ln.includes('//') ? ln.slice(0, ln.indexOf('//')) : ln;

    // Detect main function
    if (/\bint\s+Translation::translate\s*\(/.test(code)) {
      scope = 'main';
      funcName = 'translate';
      funcStartDepth = braceDepth;
    }
    // Detect bool sub-function
    else if (/\bbool\s+Translation::([A-Za-z_][A-Za-z0-9_]*)\s*\(/.test(code)) {
      const m = code.match(/\bbool\s+Translation::([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
      scope = 'sub';
      funcName = m ? m[1] : 'unknown';
      funcStartDepth = braceDepth;
    }

    // Track brace depth
    for (const ch of code) {
      if (ch === '{') braceDepth++;
      else if (ch === '}') {
        braceDepth--;
        if (scope && braceDepth <= funcStartDepth) scope = null;
      }
    }

    if (!scope) continue;

    // Check return statements
    if (scope === 'main' && /\breturn\s+(true|false)\s*;/.test(code)) {
      const retVal = code.match(/\breturn\s+(true|false)/)[1];
      issues.push({
        type:     'Wrong return in main function',
        severity: 'error',
        rule:     'P-5',
        line:     i + 1,
        snippet:  ln.trim(),
        detail:   `translate() returned "${retVal}". Main function must use return EXIT_FAILURE or return EXIT_SUCCESS.`
      });
    }

    if (scope === 'sub' && /\breturn\s+(EXIT_FAILURE|EXIT_SUCCESS)\s*;/.test(code)) {
      const retVal = code.match(/\breturn\s+(EXIT_FAILURE|EXIT_SUCCESS)/)[1];
      issues.push({
        type:     'Wrong return in sub-function',
        severity: 'error',
        rule:     'P-5',
        line:     i + 1,
        snippet:  ln.trim(),
        detail:   `Sub-function "${funcName}" returned "${retVal}". Sub-functions must use return true or return false.`
      });
    }
  }
});
