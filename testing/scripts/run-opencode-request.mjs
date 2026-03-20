import fs from 'fs';
import path from 'path';
import { execFileSync, spawn } from 'child_process';

const DEFAULT_MODEL = 'zhipuai-coding-plan/glm-5';

function parseArgs(argv) {
  const args = {
    request: '',
    dir: process.cwd(),
    model: DEFAULT_MODEL,
    strictProcessCheck: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--request' && argv[i + 1]) {
      args.request = argv[i + 1];
      i += 1;
    } else if (arg === '--dir' && argv[i + 1]) {
      args.dir = argv[i + 1];
      i += 1;
    } else if (arg === '--model' && argv[i + 1]) {
      args.model = argv[i + 1];
      i += 1;
    } else if (arg === '--strict-process-check') {
      args.strictProcessCheck = true;
    }
  }

  return args;
}

function nowIso() {
  return new Date().toISOString();
}

function fail(message) {
  console.error(`[opencode-test] ${message}`);
  process.exit(1);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function commandExists(command) {
  try {
    execFileSync('which', [command], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function hasActiveOpencodeProcess() {
  try {
    const output = execFileSync('pgrep', ['-fl', '(^|/)opencode($| )'], {
      encoding: 'utf-8',
    }).trim();

    if (!output) {
      return null;
    }

    const currentPid = String(process.pid);
    const lines = output.split('\n').filter(Boolean);
    const active = lines.filter((line) => {
      const [pid] = line.trim().split(/\s+/, 1);
      return pid && pid !== currentPid;
    });

    return active.length ? active.join('\n') : null;
  } catch {
    return null;
  }
}

function parseFrontmatterValue(content, key) {
  const match = content.match(new RegExp(`-\\s+${key}:\\s+(.+)`));
  return match ? match[1].trim() : null;
}

function stripTicks(value) {
  return value ? value.replace(/^`|`$/g, '') : value;
}

function updateStatus(statusDir, payload) {
  ensureDir(statusDir);
  const latestPath = path.join(statusDir, 'latest.json');
  const boardPath = path.join(statusDir, 'BOARD.md');

  fs.writeFileSync(latestPath, `${JSON.stringify(payload, null, 2)}\n`);

  const board = `# GoldenCrucible 测试状态板

## Current

- latest_request: \`${payload.latest_request || 'none'}\`
- latest_status: \`${payload.latest_status}\`
- latest_claim: \`${payload.latest_claim || 'none'}\`
- latest_report: \`${payload.latest_report || 'none'}\`
- updated_at: \`${payload.updated_at}\`
`;

  fs.writeFileSync(boardPath, board);
}

function writeClaim(claimPath, requestId) {
  const claim = `# ${requestId}.claim

## Metadata

- request_id: ${requestId}
- claimed_by: OpenCode direct-run
- claimed_at: ${nowIso()}
- status: claimed
`;

  fs.writeFileSync(claimPath, claim);
}

function writeFallbackReport(reportPath, requestId, status, summary, evidencePaths) {
  const report = `# ${requestId}.report

## Metadata

- request_id: ${requestId}
- executed_by: OpenCode direct-run wrapper
- executed_at: ${nowIso()}
- actual_model: ${DEFAULT_MODEL}
- browser_execution: unknown
- status: ${status}

## Summary

${summary}

## Evidence

1. stdout: \`${evidencePaths.stdoutPath}\`
2. stderr: \`${evidencePaths.stderrPath}\`
3. raw_log: \`${evidencePaths.rawLogPath}\`
`;

  fs.writeFileSync(reportPath, report);
}

function buildPrompt({ requestPath, reportPath, artifactsDir, model }) {
  return `You are the dedicated OpenCode test execution agent for this repository.

Hard rules:
1. Read the attached request file and follow it strictly.
2. Do not modify application source code.
3. For real browser interaction, use agent-browser.
4. The required model for this run is exactly ${model}.
5. Write the final markdown report to this exact path: ${reportPath}
6. Save screenshots and logs into this exact artifacts directory: ${artifactsDir}
7. In the report metadata you must include these exact fields:
   - actual_model: ${model}
   - browser_execution: agent-browser | fallback | none
   - status: passed | failed | blocked
8. If you cannot prove the expected result with evidence, do not write passed.
9. End your output with a final line: REPORT_PATH:${reportPath}
`;
}

function parseReportStatus(reportContent) {
  const match = reportContent.match(
    /(?:-\s+(?:\*\*)?status(?:\*\*)?:\s+`?(passed|failed|blocked)`?)|(?:\|\s*status\s*\|\s*`?(passed|failed|blocked)`?\s*\|)|(?:\*\*Status\*\*:\s*\*\*(PASSED|FAILED|BLOCKED)\*\*)/i
  );
  if (!match) {
    return null;
  }
  return (match[1] || match[2] || match[3]).toLowerCase();
}

function validateReport({ reportContent, requiredModel, mustUseAgentBrowser }) {
  const problems = [];

  const escapedModel = requiredModel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp(`(?:(?:\\*\\*)?actual_model(?:\\*\\*)?:\\s*${escapedModel})|(?:\\|\\s*actual_model\\s*\\|\\s*${escapedModel}\\s*\\|)`, 'i').test(reportContent)) {
    problems.push(`report 未写明 actual_model: ${requiredModel}`);
  }

  if (!/(?:(?:\*\*)?browser_execution(?:\*\*)?:\s*(agent-browser|fallback|none))|(?:\|\s*browser_execution\s*\|\s*(agent-browser|fallback|none)\s*\|)/i.test(reportContent)) {
    problems.push('report 未写明 browser_execution');
  }

  if (mustUseAgentBrowser && !/(?:(?:\*\*)?browser_execution(?:\*\*)?:\s*agent-browser)|(?:\|\s*browser_execution\s*\|\s*agent-browser\s*\|)/i.test(reportContent)) {
    problems.push('request 要求强制 agent-browser，但 report 未确认 browser_execution: agent-browser');
  }

  if (!/## Evidence/i.test(reportContent)) {
    problems.push('report 缺少 Evidence 段落');
  }

  const reportStatus = parseReportStatus(reportContent);
  if (!reportStatus) {
    problems.push('report 未写明 status');
  }

  return {
    ok: problems.length === 0,
    problems,
    reportStatus: reportStatus || 'failed',
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.request) {
    fail('缺少 --request 参数');
  }

  const repoDir = path.resolve(args.dir);
  const requestPath = path.resolve(repoDir, args.request);
  if (!fs.existsSync(requestPath)) {
    fail(`request 文件不存在: ${requestPath}`);
  }

  if (!commandExists('opencode')) {
    fail('未找到 opencode CLI');
  }

  if (!commandExists('agent-browser')) {
    fail('未找到 agent-browser CLI');
  }

  const active = hasActiveOpencodeProcess();
  if (active && args.strictProcessCheck) {
    fail(`检测到已有活跃 opencode 进程，请先退出后重试。\n${active}`);
  }
  if (active && !args.strictProcessCheck) {
    console.warn(`[opencode-test] 检测到已有活跃 opencode 进程，但当前按 warning 模式继续执行。\n${active}`);
  }

  const requestContent = fs.readFileSync(requestPath, 'utf-8');
  const requestId = stripTicks(parseFrontmatterValue(requestContent, 'request_id'))
    || path.basename(requestPath, '.md');
  const expectedReportRel = stripTicks(parseFrontmatterValue(requestContent, 'expected_report'))
    || `testing/golden-crucible/reports/${requestId}.report.md`;
  const mustUseAgentBrowser = /must_use_agent_browser:\s*true/i.test(requestContent);

  const reportPath = path.resolve(repoDir, expectedReportRel);
  const moduleDir = path.dirname(path.dirname(requestPath));
  const claimsDir = path.join(moduleDir, 'claims');
  const artifactsDir = path.join(moduleDir, 'artifacts');
  const statusDir = path.join(moduleDir, 'status');
  const claimPath = path.join(claimsDir, `${requestId}.claim.md`);
  const stdoutPath = path.join(artifactsDir, `${requestId}.stdout.log`);
  const stderrPath = path.join(artifactsDir, `${requestId}.stderr.log`);
  const rawLogPath = path.join(artifactsDir, `${requestId}.opencode.log`);

  ensureDir(claimsDir);
  ensureDir(artifactsDir);
  ensureDir(path.dirname(reportPath));
  ensureDir(statusDir);

  if (fs.existsSync(reportPath)) {
    const previousReportPath = path.join(artifactsDir, `${requestId}.previous.report.md`);
    fs.copyFileSync(reportPath, previousReportPath);
    fs.unlinkSync(reportPath);
  }

  writeClaim(claimPath, requestId);
  updateStatus(statusDir, {
    module: 'golden-crucible',
    latest_request: requestId,
    latest_status: 'running',
    latest_claim: path.relative(repoDir, claimPath),
    latest_report: fs.existsSync(reportPath) ? path.relative(repoDir, reportPath) : null,
    updated_at: nowIso(),
  });

  const prompt = buildPrompt({
    requestPath,
    reportPath,
    artifactsDir,
    model: args.model,
  });

  const stdoutStream = fs.createWriteStream(stdoutPath);
  const stderrStream = fs.createWriteStream(stderrPath);
  const rawLogStream = fs.createWriteStream(rawLogPath);

  const child = spawn(
    'opencode',
    [
      'run',
      '--dir',
      repoDir,
      '--model',
      args.model,
      '--file',
      requestPath,
      '--format',
      'default',
      prompt,
    ],
    {
      cwd: repoDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    stdout += text;
    process.stdout.write(text);
    stdoutStream.write(text);
    rawLogStream.write(text);
  });

  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    stderr += text;
    process.stderr.write(text);
    stderrStream.write(text);
    rawLogStream.write(text);
  });

  const exitCode = await new Promise((resolve) => {
    child.on('exit', (code) => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });

  stdoutStream.end();
  stderrStream.end();
  rawLogStream.end();

  if (!fs.existsSync(reportPath)) {
    writeFallbackReport(
      reportPath,
      requestId,
      exitCode === 0 ? 'failed' : 'blocked',
      exitCode === 0
        ? 'OpenCode 执行结束，但未按要求生成 report。'
        : `OpenCode 执行失败，退出码为 ${exitCode}。`,
      {
        stdoutPath: path.relative(repoDir, stdoutPath),
        stderrPath: path.relative(repoDir, stderrPath),
        rawLogPath: path.relative(repoDir, rawLogPath),
      }
    );
  }

  const reportContent = fs.readFileSync(reportPath, 'utf-8');
  const validation = validateReport({
    reportContent,
    requiredModel: args.model,
    mustUseAgentBrowser,
  });

  let finalStatus = validation.reportStatus;
  if (!validation.ok) {
    finalStatus = 'failed';
    const patchedReport = `${reportContent.trim()}\n\n## Wrapper Validation\n\n${validation.problems.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n`;
    fs.writeFileSync(reportPath, `${patchedReport}\n`);
  } else if (exitCode !== 0) {
    const warningBlock = `\n## Wrapper Warning\n\nOpenCode 进程退出码为 ${exitCode}，但 report 结构和证据链已通过 wrapper 校验，因此本次结果仍按 report 中的 \`${finalStatus}\` 认定。\n`;
    if (!reportContent.includes('## Wrapper Warning')) {
      fs.writeFileSync(reportPath, `${reportContent.trim()}\n${warningBlock}`);
    }
  }

  updateStatus(statusDir, {
    module: 'golden-crucible',
    latest_request: requestId,
    latest_status: finalStatus,
    latest_claim: path.relative(repoDir, claimPath),
    latest_report: path.relative(repoDir, reportPath),
    updated_at: nowIso(),
  });

  if (finalStatus !== 'passed') {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[opencode-test] fatal:', error);
  process.exit(1);
});
