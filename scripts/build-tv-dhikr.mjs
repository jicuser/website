// The bitmap preserves source wording and shaping on TVs with unreliable Arabic fonts.
import { spawnSync } from 'node:child_process';
import { TV_DHIKR } from '../src/content/tvReminders.js';
const result = spawnSync(
  process.env.CODEX_PRIMARY_RUNTIME_PYTHON || 'python3',
  ['scripts/render-tv-dhikr.py'],
  { input: JSON.stringify(TV_DHIKR), encoding: 'utf8' },
);
if (result.status !== 0) throw new Error(result.stderr || 'Arabic rendering failed');
console.log('Built landscape and portrait after-salah images.');
