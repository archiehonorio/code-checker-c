// validate_oldutils.js  [P-14, MA-3, MA-6, MA-7]
// Flags deprecated utility functions that must be replaced with phoenix library equivalents.
window.validators.push(function validate_oldutils(lines, raw, issues) {

  const utilsMap = [
    { old: /YB_V2Util::takeField\b/,              replacement: 'String::TakeField',          rule: 'P-14' },
    { old: /YB_V2TransUtil::isBeginWith\b/,        replacement: 'String::IsBeginWith',        rule: 'P-14' },
    { old: /YB_V2TransUtil::fixField(?:_Old)?\b/,  replacement: 'String::FixField',           rule: 'P-14' },
    { old: /YB_V2TransUtil::trimString\b/,         replacement: 'String::Trim',               rule: 'P-14' },
    { old: /YB_V2TransUtil::replaceChar\b/,        replacement: 'String::ReplaceChar',        rule: 'P-14' },
    { old: /YB_V2Util::removeChar\b/,              replacement: 'String::RemoveChar',         rule: 'P-14' },
    { old: /YB_V2TransUtil::toString\b/,           replacement: 'String::ToString',           rule: 'P-14' },
    { old: /YB_V2TransUtil::countField\b/,         replacement: 'String::CountField',         rule: 'P-14' },
    { old: /YB_V2TransUtil::strpad\b/,             replacement: 'String::PadString',          rule: 'P-14' },
    { old: /YB_V2TransUtil::htmlEncode\b/,         replacement: 'String::BasicXmlEncode',     rule: 'P-14' },
    { old: /YB_V2TransUtil::strlen\b/,             replacement: 'str.length()',               rule: 'P-14' },
    { old: /YB_V2Util::dateTime\b/,                replacement: 'DateTimeB->ToString()',      rule: 'P-14' },
    { old: /YB_V2TransUtil::isNumeric\b/,          replacement: 'String::IsNumeric',          rule: 'P-14' },
    { old: /YB_V2TransUtil::toLower\b/,            replacement: 'String::ToLower',            rule: 'P-14' },
    { old: /YB_V2TransUtil::toUpper\b/,            replacement: 'String::ToUpper',            rule: 'P-14' },
    { old: /\bstricmp\s*\(/,                       replacement: 'strcmp(String::ToUpper(a), String::ToUpper(b))', rule: 'MA-6' },
    { old: /\bstrstr\s*\(/,                        replacement: 'str.find(sub) != string::npos', rule: 'MA-7' },
    { old: /YB_V2Util::getHostname\s*\(/,          replacement: 'YB_V2Util::getEnvironmentName()', rule: 'MA-3' },
    { old: /\batof\s*\(/,                          replacement: 'strtod(str, nullptr)',       rule: 'P-14' },
    { old: /\bsetfill\s*\(/,                       replacement: 'String::PadString',          rule: 'P-15' },
    { old: /\bsetw\s*\(/,                          replacement: 'String::PadString',          rule: 'P-15' },
  ];

  // formatFloatNumber needs special handling (skip when precision == 0)
  const fmtPattern = /YB_V2TransUtil::formatFloatNumber\s*\(\s*([^,]+),\s*(\d+)\s*\)/;

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^\s*\/\//.test(ln)) continue;

    // formatFloatNumber — skip if precision is 0
    const fm = ln.match(fmtPattern);
    if (fm) {
      if (fm[2].trim() !== '0') {
        issues.push({
          type:     `Old utility – formatFloatNumber`,
          severity: 'warning',
          rule:     'P-14',
          line:     i + 1,
          snippet:  ln.trim(),
          detail:   `Replace with Number::FormatDouble(${fm[1].trim()}, ${fm[2].trim()}). (Only replace when precision ≠ 0.)`
        });
      }
      continue; // handled above, skip general map
    }

    for (const entry of utilsMap) {
      if (entry.old.test(ln)) {
        const matched = ln.match(entry.old);
        issues.push({
          type:     `Old utility – ${matched ? matched[0].replace(/\s*\($/, '()') : entry.old.source}`,
          severity: 'warning',
          rule:     entry.rule,
          line:     i + 1,
          snippet:  ln.trim(),
          detail:   `Replace with: ${entry.replacement}`
        });
      }
    }
  }
});
