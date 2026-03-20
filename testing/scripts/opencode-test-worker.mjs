import fs from 'fs';
import path from 'path';
import { execFileSync, spawn } from 'child_process';

const cwd = process.cwd();

function parseArgs(argv) {
  const args = {
    module: 'director',
    interval: 60,
    once: false,
    timeoutMinutes: 120,
    model: '',
    ignoreActiveOpencode: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--module' && argv[i + 1]) {
      args.module = argv[i + 1];
      i += 1;
    } else if (arg === '--interval' && argv[i + 1]) {
      args.interval = Number(argv[i + 1]) || 60;
      i += 1;
    } else if (arg === '--timeout-minutes' && argv[i + 1]) {
      args.timeoutMinutes = Number(argv[i + 1]) || 120;
      i += 1;
    } else if (arg === '--once') {
      args.once = true;
    } else if (arg === '--model' && argv[i + 1]) {
      args.model = argv[i + 1];
      i += 1;
    } else if (arg === '--ignore-active-opencode') {
      args.ignoreActiveOpencode = true;
    }
  }

  return args;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function hasActiveOpencodeProcess() {
  try {
    const output = execFileSync('pgrep', ['-fl', '(^|/)opencode($| )'], {
      encoding: 'utf-8',
    }).trim();

    if (!output) {
      return null;
    }

    const lines = output.split('\n').filter(Boolean);
    const currentPid = String(process.pid);
    const active = lines.filter((line) => {
      const [pid] = line.trim().split(/\s+/, 1);
      return pid && pid !== currentPid;
    });

    return active.length > 0 ? active.join('\n') : null;
  } catch {
    return null;
  }
}

function modulePaths(moduleName) {
  const baseDir = path.join(cwd, 'testing', moduleName);
  return {
    baseDir,
    requestsDir: path.join(baseDir, 'requests'),
    claimsDir: path.join(baseDir, 'claims'),
    reportsDir: path.join(baseDir, 'reports'),
    artifactsDir: path.join(baseDir, 'artifacts'),
    statusDir: path.join(baseDir, 'status'),
    promptPath: path.join(cwd, 'testing', 'prompts', 'OPENCODE_TEST_RUNNER.md'),
  };
}

function readExistingStatus(paths) {
  const latestJsonPath = path.join(paths.statusDir, 'latest.json');
  if (!fs.existsSync(latestJsonPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(latestJsonPath, 'utf-8'));
  } catch {
    return null;
  }
}

function listPendingRequests(paths) {
  ensureDir(paths.requestsDir);
  ensureDir(paths.claimsDir);
  ensureDir(paths.reportsDir);
  ensureDir(paths.artifactsDir);
  ensureDir(paths.statusDir);

  return fs.readdirSync(paths.requestsDir)
    .filter(name => name.endsWith('.md'))
    .filter(name => !name.includes('TEMPLATE'))
    .sort()
    .map(name => {
      const requestPath = path.join(paths.requestsDir, name);
      const stem = name.replace(/\.md$/, '');
      return {
        id: stem,
        requestPath,
        claimPath: path.join(paths.claimsDir, `${stem}.claim.md`),
        reportPath: path.join(paths.reportsDir, `${stem}.report.md`),
        rawLogPath: path.join(paths.artifactsDir, `${stem}.opencode.log`),
        stdoutPath: path.join(paths.artifactsDir, `${stem}.stdout.log`),
        stderrPath: path.join(paths.artifactsDir, `${stem}.stderr.log`),
      };
    })
    .filter(item => !fs.existsSync(item.reportPath))
    .filter(item => !fs.existsSync(item.claimPath));
}

function updateStatusFiles(paths, status) {
  const latestJsonPath = path.join(paths.statusDir, 'latest.json');
  const boardPath = path.join(paths.statusDir, 'BOARD.md');

  fs.writeFileSync(latestJsonPath, JSON.stringify(status, null, 2));

  const board = `# ${status.moduleLabel} 测试状态板

## 当前状态

- latest_request: \`${status.latest_request || 'none'}\`
- latest_status: \`${status.status}\`
- claimed_by: \`${status.claimed_by || 'none'}\`
- latest_claim: \`${status.latest_claim || 'none'}\`
- latest_report: \`${status.latest_report || 'none'}\`
- updated_at: \`${status.updated_at}\`

## 状态说明

- \`queued\`: 已创建请求，尚未认领
- \`claimed\`: 已被认领
- \`running\`: 正在执行
- \`passed\`: 测试通过
- \`failed\`: 测试失败
- \`blocked\`: 被环境或权限阻塞
- \`reviewed\`: Codex / Claude Code 已读取报告并进入下一轮处理
`;

  fs.writeFileSync(boardPath, board);
}

function writeClaim(item, workerName, modelName) {
  const content = `# ${item.id}.claim

## 元信息

- request_id: ${item.id}
- claimed_by: ${workerName}
- claimed_at: ${nowIso()}
- model: ${modelName || 'default'}
- status: claimed

## 执行计划

1. 读取 request 内容
2. 调用 opencode run 执行测试
3. 写入 report 和 artifacts

## Heartbeat

- last_heartbeat_at: ${nowIso()}
`;

  fs.writeFileSync(item.claimPath, content);
}

function writeFallbackReport(item, status, summary, extra, modelName) {
  const content = `# ${item.id}.report

## 元信息

- request_id: ${item.id}
- executed_by: OpenCode worker
- executed_at: ${nowIso()}
- actual_model: ${modelName || 'default'}
- status: ${status}

## 实际执行

- worker 已认领 request
- worker 调用 \`opencode run\` 尝试执行测试

## 结果

${summary}

## 关键证据

1. stdout: \`${path.relative(cwd, item.stdoutPath)}\`
2. stderr: \`${path.relative(cwd, item.stderrPath)}\`
3. raw log: \`${path.relative(cwd, item.rawLogPath)}\`

## 差异

${extra}

## 建议回传给规划端的结论

请读取本报告与 artifacts，判断是环境阻塞、模型权限问题，还是测试本身失败。
`;

  fs.writeFileSync(item.reportPath, content);
}

function buildPrompt(promptTemplate, item) {
  return `${promptTemplate}

Request file: ${item.requestPath}
Report file: ${item.reportPath}
Artifacts dir: ${path.dirname(item.rawLogPath)}

Rules:
1. Do not modify application code.
2. You may read files and run tests needed to satisfy the request.
3. Write the final markdown report to the exact report path above.
4. Save screenshots or logs into the artifacts dir.
5. If execution is blocked, still write a report with status blocked.
6. At the end, print one final line in this exact format:
REPORT_PATH:${item.reportPath}
`;
}

async function runRequest(paths, item, options) {
  const workerName = 'OpenCode worker';
  const promptTemplate = fs.readFileSync(paths.promptPath, 'utf-8');
  const prompt = buildPrompt(promptTemplate, item);
  const activeOpencode = hasActiveOpencodeProcess();

  if (activeOpencode && !options.ignoreActiveOpencode) {
    writeClaim(item, workerName, options.model);
    writeFallbackReport(
      item,
      'blocked',
      '检测到已有活跃的 `opencode` 进程。为避免测试 worker 与用户会话争抢同一数据库，本次测试未启动。',
      `活跃进程:\n\n\`\`\`\n${activeOpencode}\n\`\`\`\n\n请先退出已有 OpenCode 会话，再重新执行 worker。`,
      options.model
    );
    updateStatusFiles(paths, {
      module: options.module,
      moduleLabel: options.moduleLabel,
      latest_request: item.id,
      status: 'blocked',
      claimed_by: workerName,
      latest_claim: path.relative(cwd, item.claimPath),
      latest_report: path.relative(cwd, item.reportPath),
      updated_at: nowIso(),
    });
    return;
  }

  writeClaim(item, workerName, options.model);
  updateStatusFiles(paths, {
    module: options.module,
    moduleLabel: options.moduleLabel,
    latest_request: item.id,
    status: 'running',
    claimed_by: workerName,
    latest_claim: path.relative(cwd, item.claimPath),
    latest_report: fs.existsSync(item.reportPath) ? path.relative(cwd, item.reportPath) : null,
    updated_at: nowIso(),
  });

  const stdoutStream = fs.createWriteStream(item.stdoutPath);
  const stderrStream = fs.createWriteStream(item.stderrPath);
  const rawLogStream = fs.createWriteStream(item.rawLogPath);

  return new Promise((resolve) => {
    const commandArgs = ['run', '--dir', cwd, '--format', 'default'];
    if (options.model) {
      commandArgs.push('-m', options.model);
    }
    commandArgs.push(prompt);

    const child = spawn('opencode', commandArgs, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let finished = false;

    const finish = (resultStatus, summary, extra) => {
      if (finished) return;
      finished = true;
      stdoutStream.end();
      stderrStream.end();
      rawLogStream.end();

      if (!fs.existsSync(item.reportPath)) {
        writeFallbackReport(item, resultStatus, summary, extra, options.model);
      }

      updateStatusFiles(paths, {
        module: options.module,
        moduleLabel: options.moduleLabel,
        latest_request: item.id,
        status: resultStatus,
        claimed_by: workerName,
        latest_claim: path.relative(cwd, item.claimPath),
        latest_report: path.relative(cwd, item.reportPath),
        updated_at: nowIso(),
      });

      resolve();
    };

    const timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
      finish(
        'blocked',
        `测试执行超过 ${options.timeoutMinutes} 分钟，worker 已终止本次任务。`,
        '可能是 OpenCode 卡住、模型无响应，或测试步骤需要人工确认。'
      );
    }, options.timeoutMinutes * 60 * 1000);

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      stdoutStream.write(text);
      rawLogStream.write(text);
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      stderrStream.write(text);
      rawLogStream.write(text);
    });

    child.on('exit', (code) => {
      clearTimeout(timeoutId);
      if (code === 0) {
        finish(
          fs.existsSync(item.reportPath) ? 'passed' : 'failed',
          'OpenCode 执行结束。',
          '若 report 缺失，说明执行端没有按协议写报告。'
        );
        return;
      }

      finish(
        'failed',
        `OpenCode 退出码为 ${code}。`,
        stderr.trim() || stdout.trim() || '无额外输出。'
      );
    });

    child.on('error', (error) => {
      clearTimeout(timeoutId);
      finish(
        'blocked',
        'worker 无法启动 opencode run。',
        error.message
      );
    });
  });
}

async function tick(options) {
  const paths = modulePaths(options.module);
  const pending = listPendingRequests(paths);

  if (pending.length === 0) {
    const existing = readExistingStatus(paths);
    if (!existing) {
      updateStatusFiles(paths, {
        module: options.module,
        moduleLabel: options.moduleLabel,
        latest_request: null,
        status: 'queued',
        claimed_by: null,
        latest_claim: null,
        latest_report: null,
        updated_at: nowIso(),
      });
    }
    return false;
  }

  const next = pending[0];
  await runRequest(paths, next, options);
  return true;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const options = {
    ...args,
    moduleLabel: args.module.charAt(0).toUpperCase() + args.module.slice(1),
  };

  if (args.once) {
    await tick(options);
    return;
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    await tick(options);
    // eslint-disable-next-line no-await-in-loop
    await new Promise(resolve => setTimeout(resolve, args.interval * 1000));
  }
}

main().catch((error) => {
  console.error('[opencode-test-worker] fatal:', error);
  process.exit(1);
});
