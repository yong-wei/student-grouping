import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

function readScript(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8');
}

describe('deploy scripts', () => {
  it('hardens the tracked deployment script transport and remote script piping', () => {
    const script = readScript('deployment/deploy-remote.sh');

    expect(script).toContain('-T');
    expect(script).toContain('-B');
    expect(script).toContain('BatchMode=yes');
    expect(script).toContain('ConnectTimeout=10');
    expect(script).toContain('ServerAliveInterval=15');
    expect(script).toContain('ServerAliveCountMax=3');
    expect(script).toContain('REMOTE_SCRIPT_PATH="$(mktemp)"');
    expect(script).toContain('< "${REMOTE_SCRIPT_PATH}"');
  });

  it('uses bounded non-interactive SSH/SCP options during full deploy', () => {
    const script = readScript('.codex/skills/deploy-student-group/scripts/deploy_and_verify.sh');

    expect(script).toContain('-T');
    expect(script).toContain('-B');
    expect(script).toContain('BatchMode=yes');
    expect(script).toContain('ConnectTimeout=10');
    expect(script).toContain('ServerAliveInterval=15');
    expect(script).toContain('ServerAliveCountMax=3');
    expect(script).toContain('REMOTE_SCRIPT_PATH="$(mktemp)"');
    expect(script).toContain('< "${REMOTE_SCRIPT_PATH}"');
  });

  it('uses bounded non-interactive SSH options during live verification', () => {
    const script = readScript('.codex/skills/deploy-student-group/scripts/verify_live.sh');

    expect(script).toContain('-T');
    expect(script).toContain('BatchMode=yes');
    expect(script).toContain('ConnectTimeout=10');
    expect(script).toContain('ServerAliveInterval=15');
    expect(script).toContain('ServerAliveCountMax=3');
  });
});
