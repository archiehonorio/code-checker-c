// validate_tempdb.js  [P-7]
// tempDBSettings must be initialised from getDBLookupSettings() and deleted with delete [].
window.validators.push(function validate_tempdb(lines, raw, issues) {
  const safeVars = new Set();

  // Pass 1: collect vars assigned from getDBLookupSettings / getDBSettings
  for (const ln of lines) {
    const m = ln.match(/\b([A-Za-z_][A-Za-z0-9_]*)\s*(?:\*?\s*)=\s*.*(?:getDBLookupSettings|YB_V2Util::getDBSettings)\s*\(/i);
    if (m) safeVars.add(m[1].trim());
  }

  // Pass 2: flag usage of tempDBSettings if it wasn't safely assigned
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^\s*\/\//.test(ln)) continue;
    const am = ln.match(/\b(tempDBSettings)\s*\[/);
    if (am && !safeVars.has('tempDBSettings')) {
      issues.push({
        type:     'tempDBSettings – not initialised',
        severity: 'error',
        rule:     'P-7',
        line:     i + 1,
        snippet:  ln.trim(),
        detail:   'tempDBSettings must be assigned from YB_V2Util::getDBLookupSettings() before use.'
      });
    }
  }

  // Pass 3: flag if tempDBSettings is initialised but never deleted with delete []
  if (safeVars.has('tempDBSettings')) {
    const deleted = lines.some(ln => /\bdelete\s*\[\]\s*tempDBSettings\s*;/.test(ln));
    if (!deleted) {
      issues.push({
        type:     'tempDBSettings – missing delete []',
        severity: 'error',
        rule:     'P-7',
        line:     1,
        snippet:  '',
        detail:   'tempDBSettings is allocated with getDBLookupSettings() but never freed with: delete [] tempDBSettings;'
      });
    }
  }
});
