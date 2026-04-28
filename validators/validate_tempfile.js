// validate_tempfile.js  [P-6]
// Temporary files must be stored under /home/developer/tmp/.
// Also flags system() calls used for emailing (MA-8).
window.validators.push(function validate_tempfile(lines, raw, issues) {
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^\s*\/\//.test(ln)) continue;

    // ── Temp file path check ───────────────────────────────────────────
    // Detect any string literal path that looks like a temp file but is NOT in /home/developer/tmp/
    // Specifically targets the common mistake of using getOutputFileName() + ".msg"
    if (/getOutputFileName\s*\(\)\s*\+\s*"\.msg"/.test(ln)) {
      issues.push({
        type:     'Temp file – wrong path pattern',
        severity: 'warning',
        rule:     'P-6',
        line:     i + 1,
        snippet:  ln.trim(),
        detail:   'Temp message files must live in /home/developer/tmp/. Use: "/home/developer/tmp/" + b2beHdr->getInternalID() + ".msg"'
      });
    }

    // Detect hardcoded paths that are NOT /home/developer/tmp/
    const pathMatch = ln.match(/"(\/[^"]{3,})"/);
    if (pathMatch) {
      const p = pathMatch[1];
      if (p.includes('/tmp') && !p.startsWith('/home/developer/tmp')) {
        issues.push({
          type:     'Temp file – wrong tmp directory',
          severity: 'warning',
          rule:     'P-6',
          line:     i + 1,
          snippet:  ln.trim(),
          detail:   `Temp files must be stored in /home/developer/tmp/, not "${p}".`
        });
      }
    }

    // ── system() email command (MA-8) ──────────────────────────────────
    if (/\bsystem\s*\(/.test(ln) && /\bmail\b/i.test(ln)) {
      issues.push({
        type:     'system() email call',
        severity: 'error',
        rule:     'MA-8',
        line:     i + 1,
        snippet:  ln.trim(),
        detail:   'MAP-AU cannot call system() for email. Use YB_V2TransUtil::sendMail() instead.'
      });
    }
  }
});
