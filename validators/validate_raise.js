// validate_raise.js  [RE-4]
// Checks that raiseInternalError codes are in sequential order starting from "01".
window.validators.push(function validate_raise(lines, raw, issues) {
  let expected = 1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*\/\//.test(lines[i])) continue;
    const m = lines[i].match(/raiseInternalError\s*\(\s*"(\d+)"/);
    if (!m) continue;

    const found = parseInt(m[1], 10);
    if (found !== expected) {
      const detail = found < expected
        ? `Duplicate or out-of-order error code: found "${m[1]}", expected "${String(expected).padStart(2,'0')}".`
        : `Error code skipped: expected "${String(expected).padStart(2,'0')}", found "${m[1]}".`;
      issues.push({
        type:     'raiseInternalError – wrong sequence',
        severity: 'error',
        rule:     'RE-4',
        line:     i + 1,
        snippet:  lines[i].trim(),
        detail
      });
      expected = found + 1;
    } else {
      expected++;
    }
  }
});
