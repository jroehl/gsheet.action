// Separate from main.test.ts because CI runs `npm test` with credentials
// present: the live suite has to resolve to the real client there, while these
// tests need the stub in every environment.
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as core from '@actions/core';
import run, { Results } from './main';

let commands: string;
let outputFile: string;
let getDataResult: unknown;

jest.mock('@actions/core', () => {
  return {
    getInput: jest.fn().mockImplementation(
      (key) =>
        ({
          spreadsheetId: 'spreadsheet-id',
          commands,
          outputFile,
        }[key])
    ),
    setOutput: jest.fn(),
    debug: jest.fn(),
    notice: jest.fn(),
    warning: jest.fn(),
    setFailed: jest.fn(),
  };
});

// Step 17 re-points this specifier to 'google-sheet-cli/sheet'.
// Stubbed unconditionally so these tests exercise the output handling
// without credentials and without a payload the real API would have to hold.
jest.mock('google-sheet-cli/lib/lib/google-sheet', () => ({
  __esModule: true,
  default: class {
    async authorize(): Promise<void> {
      return undefined;
    }
    async getData(): Promise<unknown> {
      return getDataResult;
    }
  },
}));

describe('outputFile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsheet.action-'));
    // A nested path, so the action has to create the directory itself
    outputFile = path.join(tmpDir, 'nested', 'results.json');
    commands = JSON.stringify([{ command: 'getData', args: {} }]);
    process.env.GSHEET_CLIENT_EMAIL = 'test@example.com';
    process.env.GSHEET_PRIVATE_KEY = 'test-key';
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.GSHEET_CLIENT_EMAIL;
    delete process.env.GSHEET_PRIVATE_KEY;
  });

  it('writes the full results to the output file', async () => {
    getDataResult = { rawData: [['1', '2', '3']] };

    const res: Results = await run();

    expect(core.setFailed).not.toHaveBeenCalled();
    const expected = JSON.stringify({ results: res.results });
    expect(fs.readFileSync(outputFile, 'utf8')).toBe(expected);
    expect(core.setOutput).toHaveBeenCalledWith('results', expected);
    expect(core.notice).not.toHaveBeenCalled();
    expect(core.warning).not.toHaveBeenCalled();
  });

  it('replaces an oversized output with a pointer to the file', async () => {
    getDataResult = { rawData: [['x'.repeat(2 * 1024 * 1024)]] };

    const res: Results = await run();

    expect(core.setFailed).not.toHaveBeenCalled();
    const expected = JSON.stringify({ results: res.results });
    expect(Buffer.byteLength(expected)).toBeGreaterThan(1000000);
    expect(fs.readFileSync(outputFile, 'utf8')).toBe(expected);
    expect(core.setOutput).toHaveBeenCalledWith(
      'results',
      JSON.stringify({ outputFile, truncated: true })
    );
    expect(core.notice).toHaveBeenCalled();
    expect(core.warning).not.toHaveBeenCalled();
  });

  it('keeps an oversized output when there is no file to point at', async () => {
    outputFile = '';
    getDataResult = { rawData: [['x'.repeat(2 * 1024 * 1024)]] };

    const res: Results = await run();

    expect(core.setFailed).not.toHaveBeenCalled();
    const expected = JSON.stringify({ results: res.results });
    expect(Buffer.byteLength(expected)).toBeGreaterThan(1000000);
    expect(core.setOutput).toHaveBeenCalledWith('results', expected);
    expect(core.warning).toHaveBeenCalled();
    expect(core.notice).not.toHaveBeenCalled();
  });
});
