// validate_string_append.js  [P-4]
// String concatenation must use .append() instead of +=.
window.validators.push(function validate_string_append(lines, raw, issues) {
  // Collect all variables declared as string
  const stringVars = new Set();
  for (const ln of lines) {
    // string varName or string varName = ...
    const m = ln.match(/\bstring\s+([A-Za-z_][A-Za-z0-9_]*)\s*[;=,)]/g);
    if (m) {
      m.forEach(decl => {
        const v = decl.match(/\bstring\s+([A-Za-z_][A-Za-z0-9_]*)/);
        if (v) stringVars.add(v[1]);
      });
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^\s*\/\//.test(ln)) continue;

    const m = ln.match(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\+=/);
    if (!m) continue;

    const varName = m[1];
    // Only flag if declared as string, OR if the RHS is a string literal
    const rhsIsString = /\+=\s*"/.test(ln);

    if (stringVars.has(varName) || rhsIsString) {
      issues.push({
        type:     'String += concatenation',
        severity: 'warning',
        rule:     'P-4',
        line:     i + 1,
        snippet:  ln.trim(),
        detail:   `Use .append() instead of += for string concatenation. Change: ${varName} += ... → ${varName}.append(...)`
      });
    }
  }
});
