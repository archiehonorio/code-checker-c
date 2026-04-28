// validate_cout.js  [P-25]
// cout statements must be removed from production translation code.
window.validators.push(function validate_cout(lines, raw, issues) {
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^\s*\/\//.test(ln)) continue;
    if (/\bcout\s*<</.test(ln)) {
      issues.push({
        type:     'cout statement',
        severity: 'error',
        rule:     'P-25',
        line:     i + 1,
        snippet:  ln.trim(),
        detail:   'Remove all cout statements. Use raiseInternalError() for error reporting instead.'
      });
    }
  }
});
