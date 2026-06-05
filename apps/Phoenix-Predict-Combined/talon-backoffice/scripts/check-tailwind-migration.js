#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const defaultAllowlistPath = path.join(
  __dirname,
  "tailwind-migration-allowlist.json",
);

const targetDirs = [
  "packages/app",
  "packages/office",
  "packages/design-system",
];

const sourceExtensions = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
]);
const ignoredDirs = new Set([
  ".git",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);

const ruleOrder = [
  "styled-components-import",
  "styled-component-factory",
  "component-style-block",
  "ui-layout-inline-style",
];

const ruleLabels = {
  "styled-components-import": "styled-components imports",
  "styled-component-factory": "styled(...) factories",
  "component-style-block": "component <style> blocks",
  "ui-layout-inline-style": "UI layout inline styles",
};

const layoutProperties = [
  "alignContent",
  "alignItems",
  "alignSelf",
  "aspectRatio",
  "bottom",
  "boxSizing",
  "columnGap",
  "display",
  "flex",
  "flexBasis",
  "flexDirection",
  "flexFlow",
  "flexGrow",
  "flexShrink",
  "flexWrap",
  "gap",
  "grid",
  "gridArea",
  "gridAutoColumns",
  "gridAutoFlow",
  "gridAutoRows",
  "gridColumn",
  "gridColumnEnd",
  "gridColumnStart",
  "gridRow",
  "gridRowEnd",
  "gridRowStart",
  "gridTemplate",
  "gridTemplateAreas",
  "gridTemplateColumns",
  "gridTemplateRows",
  "height",
  "inset",
  "insetBlock",
  "insetBlockEnd",
  "insetBlockStart",
  "insetInline",
  "insetInlineEnd",
  "insetInlineStart",
  "justifyContent",
  "justifyItems",
  "justifySelf",
  "left",
  "margin",
  "marginBlock",
  "marginBlockEnd",
  "marginBlockStart",
  "marginBottom",
  "marginInline",
  "marginInlineEnd",
  "marginInlineStart",
  "marginLeft",
  "marginRight",
  "marginTop",
  "maxHeight",
  "maxWidth",
  "minHeight",
  "minWidth",
  "order",
  "overflow",
  "overflowX",
  "overflowY",
  "padding",
  "paddingBlock",
  "paddingBlockEnd",
  "paddingBlockStart",
  "paddingBottom",
  "paddingInline",
  "paddingInlineEnd",
  "paddingInlineStart",
  "paddingLeft",
  "paddingRight",
  "paddingTop",
  "placeContent",
  "placeItems",
  "placeSelf",
  "position",
  "right",
  "rowGap",
  "textAlign",
  "top",
  "verticalAlign",
  "width",
  "zIndex",
];

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const findings = scanRepo();
  const allowlist = loadAllowlist(options.allowlistPath);
  const comparison = compareWithAllowlist(findings, allowlist);

  if (options.updateAllowlist) {
    writeAllowlist(options.allowlistPath, findings);
    console.log(
      `Updated ${path.relative(repoRoot, options.allowlistPath)} with ${comparison.totalFindings} current findings.`,
    );
    return;
  }

  if (options.format === "json") {
    printJsonReport(findings, comparison, options);
  } else {
    printTextReport(findings, comparison, options);
  }

  if (options.strict && comparison.unallowlistedFindings.length > 0) {
    process.exitCode = 1;
  }
}

function parseArgs(argv) {
  const options = {
    allowlistPath: defaultAllowlistPath,
    format: "text",
    help: false,
    strict: false,
    updateAllowlist: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--allowlist") {
      const value = argv[index + 1];
      if (!value) {
        failUsage("--allowlist requires a file path");
      }
      options.allowlistPath = path.resolve(repoRoot, value);
      index += 1;
    } else if (arg === "--format") {
      const value = argv[index + 1];
      if (!value || !["text", "json"].includes(value)) {
        failUsage("--format must be either text or json");
      }
      options.format = value;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--json") {
      options.format = "json";
    } else if (arg === "--strict") {
      options.strict = true;
    } else if (arg === "--update-allowlist") {
      options.updateAllowlist = true;
    } else {
      failUsage(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function failUsage(message) {
  console.error(message);
  console.error("Run with --help for usage.");
  process.exit(2);
}

function printHelp() {
  console.log(`Tailwind migration audit

Usage:
  node scripts/check-tailwind-migration.js [options]

Options:
  --strict              Exit 1 when findings exceed the allowlist budget.
  --allowlist <path>    Use a custom allowlist file.
  --update-allowlist    Replace the allowlist with the current inventory.
  --format json         Emit a JSON report.
  --json                Alias for --format json.
  --help                Show this help.

Default mode reports the inventory and exits 0 so existing migration debt is visible
without blocking work. Strict mode is intended for CI once a baseline allowlist exists.`);
}

function scanRepo() {
  const files = targetDirs.flatMap((targetDir) =>
    walk(path.join(repoRoot, targetDir)),
  );
  const findings = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");
    const relativeFile = toRepoRelative(filePath);
    const lineStarts = getLineStarts(content);
    const masked = maskCommentsAndStrings(content);

    findings.push(
      ...findStyledComponentsImports(relativeFile, content, lineStarts),
      ...findStyledFactories(relativeFile, content, masked, lineStarts),
      ...findComponentStyleBlocks(relativeFile, content, masked, lineStarts),
      ...findInlineLayoutStyles(relativeFile, content, masked, lineStarts),
    );
  }

  return findings.sort(compareFindings);
}

function walk(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        files.push(...walk(path.join(dirPath, entry.name)));
      }
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const filePath = path.join(dirPath, entry.name);
    const extension = path.extname(entry.name);

    if (!sourceExtensions.has(extension) || entry.name.endsWith(".d.ts")) {
      continue;
    }

    files.push(filePath);
  }

  return files;
}

function findStyledComponentsImports(relativeFile, content, lineStarts) {
  const findings = [];
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?(?:(?!;)[\s\S])*?\s+from\s+["']styled-components["'];?/g,
    /\bimport\s+["']styled-components["'];?/g,
    /\brequire\(\s*["']styled-components["']\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      if (isCommentOnlyMatch(content, match.index)) {
        continue;
      }

      findings.push(
        createFinding({
          content,
          detail: "Import, export, or require from styled-components.",
          file: relativeFile,
          index: match.index,
          lineStarts,
          rule: "styled-components-import",
        }),
      );
    }
  }

  return findings;
}

function findStyledFactories(relativeFile, content, masked, lineStarts) {
  const findings = [];
  const pattern = /\bstyled\s*(?:\.\s*[$A-Z_a-z][$\w]*|\()/g;

  for (const match of masked.matchAll(pattern)) {
    if (isCommentOnlyMatch(content, match.index)) {
      continue;
    }

    const rawToken = content
      .slice(match.index, Math.min(content.length, match.index + 80))
      .split(/\r?\n/, 1)[0]
      .trim();

    findings.push(
      createFinding({
        content,
        detail: `Styled component factory usage: ${collapseWhitespace(rawToken)}`,
        file: relativeFile,
        index: match.index,
        lineStarts,
        rule: "styled-component-factory",
      }),
    );
  }

  return findings;
}

function findComponentStyleBlocks(relativeFile, content, masked, lineStarts) {
  const findings = [];
  const pattern = /<style(?=[\s>/])/g;

  for (const match of masked.matchAll(pattern)) {
    findings.push(
      createFinding({
        content,
        detail: "Component renders a <style> block.",
        file: relativeFile,
        index: match.index,
        lineStarts,
        rule: "component-style-block",
      }),
    );
  }

  return findings;
}

function findInlineLayoutStyles(relativeFile, content, masked, lineStarts) {
  const findings = [];
  const pattern = /\bstyle\s*=\s*\{/g;

  for (const match of masked.matchAll(pattern)) {
    if (looksLikeStyleVariableAssignment(content, match.index)) {
      continue;
    }

    const openBraceIndex = masked.indexOf("{", match.index);
    const closeBraceIndex = findMatchingBrace(masked, openBraceIndex);

    if (closeBraceIndex === -1) {
      continue;
    }

    const expression = masked.slice(openBraceIndex + 1, closeBraceIndex);
    const analysis = analyzeStyleExpression(expression);

    if (!analysis) {
      continue;
    }

    findings.push(
      createFinding({
        content,
        detail: analysis.detail,
        file: relativeFile,
        index: match.index,
        lineStarts,
        metadata: analysis.metadata,
        rule: "ui-layout-inline-style",
      }),
    );
  }

  return findings;
}

function analyzeStyleExpression(expression) {
  const trimmed = expression.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("{")) {
    const properties = collectLayoutProperties(trimmed);
    const spreadReferences = collectStyleSpreadReferences(trimmed);

    if (properties.length === 0 && spreadReferences.length === 0) {
      return null;
    }

    const reasons = [];
    if (properties.length > 0) {
      reasons.push(`layout properties: ${properties.join(", ")}`);
    }
    if (spreadReferences.length > 0) {
      reasons.push(`style spreads: ${spreadReferences.join(", ")}`);
    }

    return {
      detail: `Inline style object with ${reasons.join("; ")}.`,
      metadata: {
        layoutProperties: properties,
        spreadReferences,
      },
    };
  }

  const references = collectStyleReferences(trimmed);

  if (references.length === 0) {
    return null;
  }

  return {
    detail: `Inline style reference: ${references.join(", ")}.`,
    metadata: {
      styleReferences: references,
    },
  };
}

function collectLayoutProperties(expression) {
  const found = [];

  for (const property of layoutProperties) {
    const kebab = toKebabCase(property);
    const pattern = new RegExp(
      `(?:^|[\\s,{])(?:${escapeRegExp(property)}|["']${escapeRegExp(
        kebab,
      )}["'])\\s*:`,
      "m",
    );

    if (pattern.test(expression)) {
      found.push(property);
    }
  }

  return found;
}

function collectStyleSpreadReferences(expression) {
  const references = new Set();
  const pattern =
    /\.\.\.\s*([$A-Z_a-z][$\w.]*(?:Style|Styles|style|styles)\b(?:\([^)]*\))?)/g;

  for (const match of expression.matchAll(pattern)) {
    references.add(match[1]);
  }

  return [...references].sort();
}

function collectStyleReferences(expression) {
  const references = new Set();
  const pattern =
    /\b([$A-Z_a-z][$\w.]*(?:Style|Styles|style|styles)\b(?:\([^)]*\))?)/g;

  for (const match of expression.matchAll(pattern)) {
    references.add(match[1]);
  }

  return [...references].sort();
}

function looksLikeStyleVariableAssignment(content, index) {
  const lineStart = content.lastIndexOf("\n", index) + 1;
  const before = content.slice(lineStart, index);

  return /\b(?:const|let|var)\s+$/.test(before);
}

function findMatchingBrace(content, openBraceIndex) {
  if (openBraceIndex < 0 || content[openBraceIndex] !== "{") {
    return -1;
  }

  let depth = 0;

  for (let index = openBraceIndex; index < content.length; index += 1) {
    const char = content[index];

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function maskCommentsAndStrings(content) {
  const chars = content.split("");
  let index = 0;

  while (index < chars.length) {
    const char = chars[index];
    const next = chars[index + 1];

    if (char === "/" && next === "/") {
      chars[index] = " ";
      chars[index + 1] = " ";
      index += 2;
      while (index < chars.length && chars[index] !== "\n") {
        chars[index] = " ";
        index += 1;
      }
      continue;
    }

    if (char === "/" && next === "*") {
      chars[index] = " ";
      chars[index + 1] = " ";
      index += 2;
      while (index < chars.length) {
        const current = chars[index];
        const following = chars[index + 1];
        if (current !== "\n") {
          chars[index] = " ";
        }
        if (current === "*" && following === "/") {
          chars[index] = " ";
          chars[index + 1] = " ";
          index += 2;
          break;
        }
        index += 1;
      }
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      index = maskString(chars, index, char);
      continue;
    }

    index += 1;
  }

  return chars.join("");
}

function maskString(chars, startIndex, quote) {
  chars[startIndex] = " ";
  let index = startIndex + 1;

  while (index < chars.length) {
    const char = chars[index];

    if (char === "\\") {
      if (chars[index] !== "\n") {
        chars[index] = " ";
      }
      if (index + 1 < chars.length && chars[index + 1] !== "\n") {
        chars[index + 1] = " ";
      }
      index += 2;
      continue;
    }

    if (char === quote) {
      chars[index] = " ";
      return index + 1;
    }

    if (char !== "\n") {
      chars[index] = " ";
    }

    index += 1;
  }

  return index;
}

function createFinding({
  content,
  detail,
  file,
  index,
  lineStarts,
  metadata = {},
  rule,
}) {
  const location = getLocation(lineStarts, index);

  return {
    column: location.column,
    detail,
    file,
    line: location.line,
    metadata,
    rule,
    snippet: getLine(content, location.line).trim(),
  };
}

function getLineStarts(content) {
  const starts = [0];

  for (let index = 0; index < content.length; index += 1) {
    if (content[index] === "\n") {
      starts.push(index + 1);
    }
  }

  return starts;
}

function getLocation(lineStarts, index) {
  let low = 0;
  let high = lineStarts.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const start = lineStarts[middle];
    const nextStart = lineStarts[middle + 1] ?? Number.POSITIVE_INFINITY;

    if (index < start) {
      high = middle - 1;
    } else if (index >= nextStart) {
      low = middle + 1;
    } else {
      return {
        column: index - start + 1,
        line: middle + 1,
      };
    }
  }

  return { column: 1, line: 1 };
}

function getLine(content, lineNumber) {
  const lines = content.split(/\r?\n/);
  return lines[lineNumber - 1] ?? "";
}

function isCommentOnlyMatch(content, index) {
  const lineStart = content.lastIndexOf("\n", index) + 1;
  const before = content.slice(lineStart, index);
  return before.includes("//");
}

function loadAllowlist(allowlistPath) {
  if (!fs.existsSync(allowlistPath)) {
    return {
      entries: new Map(),
      exists: false,
      path: allowlistPath,
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
  } catch (error) {
    console.error(
      `Unable to parse allowlist ${allowlistPath}: ${error.message}`,
    );
    process.exit(2);
  }

  const entries = new Map();
  for (const entry of parsed.entries ?? []) {
    if (!entry.file || !entry.rule) {
      continue;
    }

    entries.set(makeAllowlistKey(entry.file, entry.rule), {
      allowed: Number(entry.allowed ?? entry.count ?? 0),
      file: entry.file,
      rule: entry.rule,
    });
  }

  return {
    entries,
    exists: true,
    path: allowlistPath,
  };
}

function writeAllowlist(allowlistPath, findings) {
  const counts = countByFileAndRule(findings);
  const entries = [...counts.entries()]
    .map(([key, allowed]) => {
      const [file, rule] = key.split("::");
      return { allowed, file, rule };
    })
    .sort(
      (left, right) =>
        left.file.localeCompare(right.file) ||
        ruleOrder.indexOf(left.rule) - ruleOrder.indexOf(right.rule),
    );

  const allowlist = {
    version: 1,
    description:
      "Baseline for the Tiangge Tailwind migration audit. Lower or remove entries as files are migrated.",
    targets: targetDirs,
    rules: ruleOrder.map((rule) => ({
      id: rule,
      label: ruleLabels[rule],
    })),
    entries,
  };

  fs.mkdirSync(path.dirname(allowlistPath), { recursive: true });
  fs.writeFileSync(allowlistPath, `${JSON.stringify(allowlist, null, 2)}\n`);
}

function compareWithAllowlist(findings, allowlist) {
  const counts = countByFileAndRule(findings);
  const markedFindings = markFindings(findings, allowlist);
  const unallowlistedFindings = markedFindings.filter(
    (finding) => !finding.allowlisted,
  );
  const staleEntries = [];

  for (const [key, entry] of allowlist.entries.entries()) {
    const actual = counts.get(key) ?? 0;
    if (entry.allowed > actual) {
      staleEntries.push({
        actual,
        allowed: entry.allowed,
        file: entry.file,
        rule: entry.rule,
      });
    }
  }

  return {
    allowlistExists: allowlist.exists,
    allowlistPath: allowlist.path,
    findings: markedFindings,
    staleEntries,
    totalFindings: findings.length,
    unallowlistedFindings,
  };
}

function countByFileAndRule(findings) {
  const counts = new Map();

  for (const finding of findings) {
    const key = makeAllowlistKey(finding.file, finding.rule);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

function markFindings(findings, allowlist) {
  const seen = new Map();

  return findings.map((finding) => {
    const key = makeAllowlistKey(finding.file, finding.rule);
    const count = (seen.get(key) ?? 0) + 1;
    const allowed = allowlist.entries.get(key)?.allowed ?? 0;
    seen.set(key, count);

    return {
      ...finding,
      allowlisted: count <= allowed,
    };
  });
}

function makeAllowlistKey(file, rule) {
  return `${file}::${rule}`;
}

function printJsonReport(findings, comparison, options) {
  const report = {
    allowlist: {
      exists: comparison.allowlistExists,
      path: toRepoRelative(comparison.allowlistPath),
      staleEntries: comparison.staleEntries,
      unallowlistedCount: comparison.unallowlistedFindings.length,
    },
    mode: options.strict ? "strict" : "inventory",
    summary: buildSummary(findings),
    targets: targetDirs,
    totalFindings: findings.length,
    findings: comparison.findings,
  };

  console.log(JSON.stringify(report, null, 2));
}

function printTextReport(findings, comparison, options) {
  console.log("Tailwind migration audit");
  console.log(`Mode: ${options.strict ? "strict" : "inventory"}`);
  console.log(`Targets: ${targetDirs.join(", ")}`);
  console.log(
    `Allowlist: ${toRepoRelative(comparison.allowlistPath)}${
      comparison.allowlistExists ? "" : " (missing)"
    }`,
  );
  console.log(`Findings: ${findings.length}`);
  console.log(`Unallowlisted: ${comparison.unallowlistedFindings.length}`);

  printSummaryTable(findings);

  if (comparison.staleEntries.length > 0) {
    console.log("\nStale allowlist entries:");
    for (const entry of comparison.staleEntries) {
      console.log(
        `  ${entry.file} ${entry.rule}: allowed ${entry.allowed}, actual ${entry.actual}`,
      );
    }
  }

  console.log("\nDetailed findings:");
  for (const rule of ruleOrder) {
    const ruleFindings = comparison.findings.filter(
      (finding) => finding.rule === rule,
    );

    if (ruleFindings.length === 0) {
      continue;
    }

    console.log(`\n${ruleLabels[rule]} (${ruleFindings.length})`);
    for (const finding of ruleFindings) {
      const status = finding.allowlisted ? "allowlisted" : "unallowlisted";
      console.log(
        `  [${status}] ${finding.file}:${finding.line}:${finding.column} ${finding.detail}`,
      );
      if (finding.snippet) {
        console.log(`    ${collapseWhitespace(finding.snippet)}`);
      }
    }
  }

  if (options.strict && comparison.unallowlistedFindings.length > 0) {
    console.log("\nStrict mode failed: findings exceed the allowlist budget.");
  } else if (!options.strict) {
    console.log(
      "\nInventory mode only reports findings. Re-run with --strict to enforce the allowlist budget.",
    );
  }
}

function printSummaryTable(findings) {
  const summary = buildSummary(findings);
  const packages = targetDirs;
  const rows = ruleOrder.map((rule) => {
    const byPackage = packages.map(
      (packageName) => summary.byRuleAndPackage[rule]?.[packageName] ?? 0,
    );
    const total = summary.byRule[rule] ?? 0;
    return [ruleLabels[rule], ...byPackage, total];
  });

  const headers = ["Rule", ...packages, "Total"];
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => String(row[index]).length)),
  );

  console.log("");
  console.log(formatRow(headers, widths));
  console.log(
    formatRow(
      widths.map((width) => "-".repeat(width)),
      widths,
    ),
  );
  for (const row of rows) {
    console.log(formatRow(row, widths));
  }
}

function buildSummary(findings) {
  const byRule = {};
  const byRuleAndPackage = {};

  for (const rule of ruleOrder) {
    byRule[rule] = 0;
    byRuleAndPackage[rule] = {};
    for (const packageName of targetDirs) {
      byRuleAndPackage[rule][packageName] = 0;
    }
  }

  for (const finding of findings) {
    const packageName = packageForFile(finding.file);
    byRule[finding.rule] = (byRule[finding.rule] ?? 0) + 1;
    byRuleAndPackage[finding.rule][packageName] =
      (byRuleAndPackage[finding.rule][packageName] ?? 0) + 1;
  }

  return {
    byRule,
    byRuleAndPackage,
  };
}

function formatRow(row, widths) {
  return row
    .map((value, index) => String(value).padEnd(widths[index]))
    .join("  ");
}

function packageForFile(file) {
  const parts = file.split("/");
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : "(unknown)";
}

function toRepoRelative(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, "/");
}

function compareFindings(left, right) {
  return (
    ruleOrder.indexOf(left.rule) - ruleOrder.indexOf(right.rule) ||
    left.file.localeCompare(right.file) ||
    left.line - right.line ||
    left.column - right.column
  );
}

function collapseWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function toKebabCase(value) {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

main();
