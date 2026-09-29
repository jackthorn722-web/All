// npm run dashboard
// Opens the DialedIn dashboard in your browser (http://localhost:4400).
// Keep this window open while you use it; Ctrl+C stops it.
import { spawn } from 'node:child_process';
import { enterRepoRoot, fail, green, bold, dim } from '../lib/cli.js';
import { startDashboard } from '../dashboard/server.mjs';

enterRepoRoot();
const port = Number(process.env.DASHBOARD_PORT || 4400);
try {
  await startDashboard({ port });
} catch (e) {
  fail(e.code === 'EADDRINUSE' ? `Port ${port} is busy: the dashboard is probably already open in another window.` : e.message);
}
const url = `http://localhost:${port}`;
console.log(green(`\nDashboard running: ${bold(url)}`));
console.log(dim('Keep this window open while you use it. Ctrl+C to stop.\n'));

if (!process.argv.includes('--no-open')) {
  const [cmd, args] = process.platform === 'win32' ? ['explorer', [url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  spawn(cmd, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
}
