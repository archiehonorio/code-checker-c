// validate_multiple_raise.js  [RE-2]
// Only ONE raise call (raiseInternalError / raiseExternalError / raiseIgnoreDocument)
// should precede each return EXIT_FAILURE. Multiple sequential raises without a return
// between them is a PQ-prone error.
window.validators.push(function validate_multiple_raise(lines, raw, issues) {
  let lastRaiseLine = -1;
  let lastRaiseText = '';

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^\s*\/\//.test(ln)) continue;

    const isRaise  = /\braise(?:InternalError|ExternalError|IgnoreDocument)\s*\(/.test(ln);
    const isReturn = /\breturn\s+(EXIT_FAILURE|EXIT_SUCCESS|true|false)\s*;/.test(ln);
    // Opening brace alone on a line (or after an if/else) often means a new branch — reset
    const isBranch = /^\s*(if|else|for|while|switch|case|catch)\b/.test(ln);

    if (isRaise) {
      if (lastRaiseLine !== -1) {
        // Second raise before a return — flag it
        issues.push({
          type:     'Multiple raises before return',
          severity: 'error',
          rule:     'RE-2',
          line:     i + 1,
          snippet:  ln.trim(),
          detail:   `A raise was already called at line ${lastRaiseLine} ("${lastRaiseText}") without a return in between. Only one raise should precede each return EXIT_FAILURE.`
        });
      }
      lastRaiseLine = i + 1;
      lastRaiseText = ln.trim().slice(0, 60);
    }

    if (isReturn || isBranch) {
      // Reset on return OR when entering a new conditional branch
      lastRaiseLine = -1;
      lastRaiseText = '';
    }
  }
});
