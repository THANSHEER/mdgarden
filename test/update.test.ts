import { describe, expect, it } from 'vitest';
import { buildUpdatePlan, detectUpdateSource } from '../src/cli/update.js';

describe('update source detection', () => {
  it('detects Homebrew installs from the Cellar path', () => {
    expect(detectUpdateSource('/opt/homebrew/Cellar/mdgarden/0.3.0/bin/mdgarden')).toBe('homebrew');
  });

  it('detects standalone binaries from the executable name', () => {
    expect(detectUpdateSource('/usr/local/bin/mdgarden')).toBe('standalone');
  });

  it('falls back to npm for node-based installs', () => {
    expect(detectUpdateSource('/opt/homebrew/bin/node')).toBe('npm');
  });
});

describe('update plan', () => {
  it('uses brew upgrade for Homebrew installs', () => {
    const plan = buildUpdatePlan('/opt/homebrew/Cellar/mdgarden/0.3.0/bin/mdgarden');
    expect(plan.source).toBe('homebrew');
    expect(plan.command).toBe('brew');
    expect(plan.args).toEqual(['upgrade', 'mdgarden']);
  });

  it('uses the standalone installer for unix binaries', () => {
    const plan = buildUpdatePlan('/usr/local/bin/mdgarden', 'linux');
    expect(plan.source).toBe('standalone');
    expect(plan.command).toBe('sh');
    expect(plan.args[0]).toBe('-c');
    expect(plan.env?.MDGARDEN_BIN_DIR).toBe('/usr/local/bin');
    expect(plan.env?.MDGARDEN_VERSION).toBe('latest');
  });

  it('uses a detached PowerShell helper for standalone Windows binaries', () => {
    const plan = buildUpdatePlan('C:/Users/test/AppData/Local/Programs/mdgarden/mdgarden.exe', 'win32');
    expect(plan.source).toBe('standalone');
    expect(plan.command).toBe('powershell');
    expect(plan.detached).toBe(true);
    expect(plan.args.join(' ')).toContain('MDGARDEN_BIN_DIR');
  });

  it('uses npm for node-based installs', () => {
    const plan = buildUpdatePlan('/opt/homebrew/bin/node');
    expect(plan.source).toBe('npm');
    expect(plan.command).toBe('npm');
    expect(plan.args).toEqual(['install', '-g', 'mdgarden@latest']);
  });
});
