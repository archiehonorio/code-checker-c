// validate_divzero.js  [P-17]
// Detects literal division by zero and division by a variable last assigned to 0.
window.validators.push(function validate_divzero(lines, raw, issues) {
  const zeroVars = new Map();
  let inBlock = false;

  for (let i = 0; i < lines.length; i++) {
    let ln = lines[i];

    // Multi-line comment tracking
    if (inBlock) {
      if (ln.includes('*/')) { inBlock = false; ln = ln.split('*/')[1] || ''; }
      else continue;
    }
    if (ln.includes('/*')) { inBlock = true; ln = ln.split('/*')[0]; }
    const t = ln.trim();
    if (!t || t.startsWith('//')) continue;

    // Track assignments
    const asgn = ln.match(/\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^;=]+);/);
    if (asgn) zeroVars.set(asgn[1], asgn[2].trim() === '0');

    // Literal /0
    if (/\/\s*0(?![0-9.])/.test(ln)) {
      issues.push({
        type:     'Division by zero (literal)',
        severity: 'error',
        rule:     'P-17',
        line:     i + 1,
        snippet:  ln.trim(),
        detail:   'Division by the literal value 0 will cause a runtime error.'
      });
    }

    // Division by variable known to be 0
    const dv = ln.match(/\/\s*([A-Za-z_][A-Za-z0-9_]*)\b/);
    if (dv && zeroVars.get(dv[1]) === true) {
      issues.push({
        type:     'Division by zero (variable)',
        severity: 'error',
        rule:     'P-17',
        line:     i + 1,
        snippet:  ln.trim(),
        detail:   `Variable "${dv[1]}" was last assigned 0 and is used as a divisor. Add a guard: if (${dv[1]} != 0).`
      });
    }
  }
});
