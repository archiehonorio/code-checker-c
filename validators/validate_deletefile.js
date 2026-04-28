// validate_deletefile.js  [P-6]
// deleteFile must be preceded by isFileExist for the same variable.
// Also checks that temp files use the /home/developer/tmp/ path.
window.validators.push(function validate_deletefile(lines, raw, issues) {
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^\s*\/\//.test(ln)) continue;

    // ── deleteFile without isFileExist guard ───────────────────────────
    const delMatch = ln.match(/YB_V2Util::deleteFile\s*\(\s*([^)]+)\s*\)/);
    if (delMatch) {
      const varName = delMatch[1].trim();
      let guarded = false;
      for (let j = Math.max(0, i - 15); j < i; j++) {
        if (new RegExp(`YB_V2Util::isFileExist\\s*\\(\\s*${varName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*\\)`).test(lines[j])) {
          guarded = true;
          break;
        }
      }
      if (!guarded) {
        issues.push({
          type:     'deleteFile – missing isFileExist guard',
          severity: 'error',
          rule:     'P-6',
          line:     i + 1,
          snippet:  ln.trim(),
          detail:   `YB_V2Util::deleteFile(${varName}) must be preceded by: if (YB_V2Util::isFileExist(${varName})).`
        });
      }
    }

    // ── Temp file must go to /home/developer/tmp/ ──────────────────────
    if (/getOutputFileName\s*\(\)\s*\+\s*"\.msg"/.test(ln)) {
      issues.push({
        type:     'Temp file – wrong path',
        severity: 'warning',
        rule:     'P-6',
        line:     i + 1,
        snippet:  ln.trim(),
        detail:   'Replace getOutputFileName() + ".msg" with "/home/developer/tmp/" + b2beHdr->getInternalID() + ".msg"'
      });
    }
  }
});
