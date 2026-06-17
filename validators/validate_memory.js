// validators/validate_memory.js  [P-7]
// Scope-aware leak check. Replaces the old "permanent delete" heuristic.
//
// Key correctness rules (the things the regex version got wrong):
//   - Only LOCAL pointers are tracked. `db = new ...` with no local `Type* db`
//     declaration is a class member (deleted in destructor / owned elsewhere),
//     so it is NOT flagged in translate().
//   - A pointer is "clean" at a return if a delete of it appears in the same
//     block or an ancestor block, before the return (matching B2BE's idiom of
//     `delete x; ... return;` per branch).
//   - A pointer whose declaration block has already closed is OUT OF SCOPE at
//     the return and is ignored (e.g. `docs` declared inside try{} is not in
//     scope at the trailing `return EXIT_SUCCESS`).
window.validators.push(function validate_memory(lines, raw, issues) {
  const S = window.CppScope;
  const info = S.analyze(lines);
  const code = info.code;

  // function bodies: a block whose header looks like `... Name::method(...)`
  const funcOpenRe = /\b[A-Za-z_][\w:<>\*&\s]*\b[A-Za-z_]\w*::[A-Za-z_]\w*\s*\(/;

  // collect, per line, info we need
  const localPtr = {};   // name -> { declBlockOpen, allocLine }
  let curFuncName = null;
  let curFuncOpen = -1;

  function funcOf(i) {
    // innermost encloser whose header is a function signature
    const enc = info.enclosers[i];
    for (let k = enc.length - 1; k >= 0; k--) {
      if (funcOpenRe.test(enc[k].header)) return enc[k].open;
    }
    return -1;
  }

  // First pass: find local pointer declarations and allocations.
  // A local pointer decl: `Type * name` (optionally = ...). Not a member.
  const declRe  = /\b[A-Za-z_][\w:<>]*\s*\*\s*([A-Za-z_]\w*)\s*(?:=|;|\))/;
  const allocRe = /\b([A-Za-z_]\w*)\s*=\s*(?:new\b|YB_V2Util::getDBLookupSettings\s*\()/;

  // map: funcOpen -> { name -> {declBlockOpen, allocLine} }
  const funcs = {};
  for (let i = 0; i < code.length; i++) {
    const f = funcOf(i);
    if (f === -1) continue;
    if (!funcs[f]) funcs[f] = {};

    const dm = code[i].match(declRe);
    if (dm) {
      const name = dm[1];
      const enc = info.enclosers[i];
      const declBlockOpen = enc.length ? enc[enc.length - 1].open : f;
      if (!funcs[f][name]) funcs[f][name] = { declBlockOpen, allocLine: -1 };
    }
    const am = code[i].match(allocRe);
    if (am) {
      const name = am[1];
      if (funcs[f][name]) {                     // only if locally declared
        funcs[f][name].allocLine = i;
      }
    }
  }

  const delRe = /\bdelete\s*(?:\[\s*\])?\s*([A-Za-z_]\w*)\s*;/g;
  const retRe = /\b(?:return\s+(?:EXIT_FAILURE|EXIT_SUCCESS|true|false)\s*;|throw\b)/;

  // gather all delete lines per name
  for (let i = 0; i < code.length; i++) {
    if (!retRe.test(code[i])) continue;
    const f = funcOf(i);
    if (f === -1 || !funcs[f]) continue;

    for (const name in funcs[f]) {
      const obj = funcs[f][name];
      if (obj.allocLine === -1) continue;              // declared but never new-ed
      if (obj.allocLine >= i) continue;                // allocated after this return
      // in scope? declaration block must still be open at the return
      const openHere = info.enclosers[i].some(e => e.open === obj.declBlockOpen) ||
                       obj.declBlockOpen === f && info.enclosers[i].some(e => e.open === f);
      const declBlockStillOpen = info.enclosers[i].some(e => e.open === obj.declBlockOpen);
      if (!declBlockStillOpen && obj.declBlockOpen !== f) continue;
      if (obj.declBlockOpen === f && !info.enclosers[i].some(e => e.open === f)) continue;

      // is there a delete of `name` covering the path to this return?
      let covered = false;
      for (let d = obj.allocLine + 1; d < i; d++) {
        delRe.lastIndex = 0;
        let m, hit = false;
        while ((m = delRe.exec(code[d])) !== null) { if (m[1] === name) { hit = true; break; } }
        if (hit && S.coversPath(info, d, i)) { covered = true; break; }
      }

      if (!covered) {
        issues.push({
          type: 'Missing delete before return',
          severity: 'error',
          rule: 'P-7',
          line: i + 1,
          snippet: lines[i].trim(),
          detail: `Local object "${name}" (allocated at line ${obj.allocLine + 1}) is not deleted on the path to this return.`
        });
      }
    }
  }
});
