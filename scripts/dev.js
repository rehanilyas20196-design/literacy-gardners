#!/usr/bin/env node
/**
 * Runs the API and the Next.js dev server together.
 * Replaces `npm run dev:api & npm run dev:web`, which blocks on the first
 * command forever under Windows cmd.
 */
const { spawn } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';

const targets = [
  { name: 'api', args: ['--prefix', 'backend', 'run', 'dev'] },
  { name: 'web', args: ['--prefix', 'frontend', 'run', 'dev'] },
];

const children = [];
let shuttingDown = false;

// `npm` is a .cmd file on Windows, which can only be spawned through cmd.exe.
function runNpm(args) {
  if (isWindows) {
    return spawn('cmd.exe', ['/d', '/s', '/c', `npm ${args.join(' ')}`], {
      cwd: root,
      stdio: 'inherit',
    });
  }
  return spawn('npm', args, { cwd: root, stdio: 'inherit' });
}

function killTree(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (isWindows) {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  children.forEach(killTree);
  setTimeout(() => process.exit(code), 700);
}

for (const target of targets) {
  const child = runNpm(target.args);
  child.on('error', (err) => {
    console.error(`[${target.name}] could not start: ${err.message}`);
    shutdown(1);
  });
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(`[${target.name}] stopped (${signal || code}) — shutting down the other process.`);
    shutdown(code || 0);
  });
  children.push(child);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(0));
}
