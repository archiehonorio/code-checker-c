// validate_select_star.js  [S-5]
// SELECT * is not allowed; column names must be explicitly listed.
// (Also handled in validate_sql.js — this validator provides a standalone check.)
window.validators.push(function validate_select_star(lines, raw, issues) {
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^\s*\/\//.test(ln)) continue;
    // Only flag SELECT * that is clearly a SQL SELECT (not a C++ pointer dereference)
    if (/\bSELECT\s+\*\s*(?:FROM\b|")/i.test(ln)) {
      issues.push({
        type:     'SQL – SELECT * usage',
        severity: 'warning',
        rule:     'S-5',
        line:     i + 1,
        snippet:  ln.trim(),
        detail:   'Explicitly list column names in SELECT instead of using SELECT *. This avoids unexpected data and improves readability.'
      });
    }
  }
});
