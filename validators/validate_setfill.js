// validate_setfill.js  [P-15]
// setfill / setw must be replaced with String::PadString.
window.validators.push(function validate_setfill(lines, raw, issues) {
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^\s*\/\//.test(ln)) continue;
    if (/\bsetfill\s*\(/.test(ln)) {
      issues.push({
        type:     'setfill usage',
        severity: 'warning',
        rule:     'P-15',
        line:     i + 1,
        snippet:  ln.trim(),
        detail:   'Replace setfill/setw with String::PadString(source, fillChar, width, String::PADLEFT or String::PADRIGHT).'
      });
    } else if (/\bsetw\s*\(/.test(ln)) {
      issues.push({
        type:     'setw usage',
        severity: 'warning',
        rule:     'P-15',
        line:     i + 1,
        snippet:  ln.trim(),
        detail:   'Replace setfill/setw with String::PadString(source, fillChar, width, String::PADLEFT or String::PADRIGHT).'
      });
    }
  }
});
