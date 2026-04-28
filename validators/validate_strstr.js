// validate_strstr.js  [MA-7]
// strstr() must be replaced with str.find(sub) != string::npos.
window.validators.push(function validate_strstr(lines, raw, issues) {
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^\s*\/\//.test(ln)) continue;
    if (/\bstrstr\s*\(/.test(ln)) {
      issues.push({
        type:     'strstr usage',
        severity: 'warning',
        rule:     'MA-7',
        line:     i + 1,
        snippet:  ln.trim(),
        detail:   'Replace strstr(str, sub) != NULL  with  str.find(sub) != string::npos'
      });
    }
  }
});
