// validate_constructor.js  [MA-2]
// Checks: (1) using namespace b2be::utils is present,
//         (2) constructor accepts programName and assigns it to translationName.
window.validators.push(function validate_constructor(lines, raw, issues) {

  // ── Check 1: using namespace b2be::utils ───────────────────────────
  if (!/using\s+namespace\s+b2be\s*::\s*utils\s*;/.test(raw)) {
    issues.push({
      type:     'Missing namespace declaration',
      severity: 'error',
      rule:     'MA-2',
      line:     1,
      snippet:  '',
      detail:   'Add  "using namespace b2be::utils;"  near the top of Translation.cpp, after #include "Translation.h".'
    });
  }

  // ── Check 2: translationName = programName in constructor ──────────
  if (!/translationName\s*=\s*programName\s*;/.test(raw)) {
    // Only flag if the constructor is present (otherwise it might be a partial paste)
    if (/Translation::Translation\s*\(/.test(raw)) {
      issues.push({
        type:     'Missing translationName assignment',
        severity: 'error',
        rule:     'MA-2',
        line:     (() => {
          for (let i = 0; i < lines.length; i++) {
            if (/Translation::Translation\s*\(/.test(lines[i])) return i + 1;
          }
          return 1;
        })(),
        snippet:  '',
        detail:   'In Translation::Translation constructor, add:  translationName = programName;'
      });
    }
  }

  // ── Check 3: programName must be a constructor parameter ───────────
  // Find the constructor and check its parameter list includes string programName
  for (let i = 0; i < lines.length; i++) {
    if (/Translation::Translation\s*\(/.test(lines[i])) {
      // Collect constructor signature (up to 12 lines)
      let sig = '';
      for (let j = i; j < Math.min(lines.length, i + 12); j++) {
        sig += lines[j] + '\n';
        if (sig.includes('{')) break;
      }
      if (!/string\s+programName/.test(sig)) {
        issues.push({
          type:     'Constructor missing programName parameter',
          severity: 'error',
          rule:     'MA-2',
          line:     i + 1,
          snippet:  lines[i].trim(),
          detail:   'The Translation::Translation constructor must accept a "string programName" parameter and assign it to translationName.'
        });
      }
      break;
    }
  }
});
