// validate_string_empty.js  [P-20]
// == "" and != "" should be replaced with .length() == 0 / .length() > 0.
window.validators.push(function validate_string_empty(lines, raw, issues) {
  // Pattern: identifier (or member access) followed by == "" or != ""
  // We skip lines that are clearly SQL append() calls to reduce false positives.
  const cmpPattern = /([A-Za-z_][A-Za-z0-9_.>\-:]*)\s*(==|!=)\s*""\s*[;)]/;

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^\s*\/\//.test(ln)) continue;

    // Skip SQL string building lines
    if (/sql\.append\s*\(|sql\s*=\s*"|\.append\s*\(\s*"/.test(ln)) continue;

    const m = ln.match(cmpPattern);
    if (!m) continue;

    const varExpr = m[1];
    const op      = m[2];
    const replacement = op === '=='
      ? `${varExpr}.length() == 0`
      : `${varExpr}.length() > 0`;

    issues.push({
      type:     'String compare with ""',
      severity: 'warning',
      rule:     'P-20',
      line:     i + 1,
      snippet:  ln.trim(),
      detail:   `Replace "${varExpr} ${op} \\"\\""  with  "${replacement}"`
    });
  }
});
