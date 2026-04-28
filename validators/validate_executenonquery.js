// validate_executenonquery.js  [MA-4]
// INSERT / UPDATE / DELETE / REPLACE statements must use executeNonQuery, not executeQuery.
window.validators.push(function validate_executenonquery(lines, raw, issues) {
  const nonSelectRe = /\b(INSERT\s+INTO|UPDATE\s+\w|DELETE\s+FROM|REPLACE\s+INTO)\b/i;
  const selectRe    = /\bSELECT\b/i;

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^\s*\/\//.test(ln)) continue;
    if (!/->executeQuery\s*\(/.test(ln)) continue;

    // Collect the SQL variable content from the preceding lines (up to 40 lines back)
    let sqlBlock = '';
    for (let j = Math.max(0, i - 40); j <= i; j++) {
      const l = lines[j];
      // Only include lines that are part of SQL construction
      if (/\bsql\b.*=\s*"|\.append\s*\(/.test(l)) sqlBlock += l + '\n';
    }

    // If the SQL block contains DML keywords but no SELECT, flag it
    if (nonSelectRe.test(sqlBlock) && !selectRe.test(sqlBlock)) {
      const verb = sqlBlock.match(nonSelectRe);
      issues.push({
        type:     'executeQuery on DML statement',
        severity: 'error',
        rule:     'MA-4',
        line:     i + 1,
        snippet:  ln.trim(),
        detail:   `"${verb ? verb[0] : 'DML'}" SQL should use executeNonQuery(). executeQuery() is for SELECT statements only.`
      });
    }
  }
});
