// validate_struct.js  [P-8]
// struct declarations are not allowed; use existing B2BE data structures or class.
window.validators.push(function validate_struct(lines, raw, issues) {
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^\s*\/\//.test(ln)) continue;
    // Match struct keyword followed by an identifier (not a function-like usage)
    if (/\bstruct\s+[A-Za-z_][A-Za-z0-9_]*\s*[\{;]/.test(ln)) {
      issues.push({
        type:     'struct usage',
        severity: 'warning',
        rule:     'P-8',
        line:     i + 1,
        snippet:  ln.trim(),
        detail:   'Do not use struct. Use existing B2BE data structures or a class instead.'
      });
    }
  }
});
