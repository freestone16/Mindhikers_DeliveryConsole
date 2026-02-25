const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const REMOTION_STUDIO_DIR = path.join(os.homedir(), '.opencode/skills/RemotionStudio');
const outputPath = path.join(__dirname, 'test_render.mp4');
if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

const propsJson = JSON.stringify({ text: "test" });

const args = [
    'run', 'render',
    'SceneComposer',
    outputPath,
    '--codec=h264',
    `--props=${propsJson}`
];

console.log(`Command: npm ${args.join(' ')}`);
console.log(`CWD: ${REMOTION_STUDIO_DIR}`);

const renderProcess = spawn('npm', args, {
    cwd: REMOTION_STUDIO_DIR,
    env: { ...process.env, NODE_ENV: 'production' },
    shell: true
});

let stdout = '';
let stderr = '';

renderProcess.stdout.on('data', (data) => {
    stdout += data.toString();
    console.log('[STDOUT]', data.toString());
});

renderProcess.stderr.on('data', (data) => {
    stderr += data.toString();
    console.log('[STDERR]', data.toString());
});

renderProcess.on('close', (code) => {
    console.log(`Exited with code ${code}`);
    if (fs.existsSync(outputPath)) {
        console.log('File created successfully.');
    } else {
        console.log('File was NOT created.');
    }
});
