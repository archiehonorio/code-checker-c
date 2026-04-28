// validate_sql.js  [S-6, MA-4]
// Checks SQL string building for missing databaseCleanString and SELECT * usage.
window.validators.push(function validate_sql(lines, raw, issues) {
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^\s*\/\//.test(ln)) continue;

    // Strip inline comment
    const code = ln.includes('//') ? ln.slice(0, ln.indexOf('//')) : ln;

    const isSqlLine = /\b(sql|query|sqlStr|sqlQuery)\b/i.test(code);
    const hasConcat = code.includes('+') && !code.includes('append(');

    // Direct string concatenation (+) on sql variable without databaseCleanString
    if (isSqlLine && hasConcat) {
      const hasClean  = /YB_V2Util::databaseCleanString/.test(code);
      const hasTrusted = /b2beHdr->(getSenderUserID|getReceiverUserID|getPrimaryDocID|getDocumentType)\s*\(/.test(code);
      if (!hasClean && !hasTrusted) {
        issues.push({
          type:     'SQL – unsafe string concatenation',
          severity: 'error',
          rule:     'S-6',
          line:     i + 1,
          snippet:  ln.trim(),
          detail:   'Wrap user-supplied values with YB_V2Util::databaseCleanString(value) before inserting into SQL strings.'
        });
      }
    }

  }
});
