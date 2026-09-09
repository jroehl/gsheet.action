import * as core from '@actions/core';
import run, { Results } from './main';

const worksheetTitle = `gsheet.action-test-${Date.now()}`;
let commands: string;

jest.mock('@actions/core', () => {
  return {
    getInput: jest.fn().mockImplementation(
      (key) =>
        ({
          spreadsheetId: process.env.TEST_SPREADSHEET_ID,
          commands,
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
// The tests below need the real client; the stub only keeps the offline run
// from loading googleapis for a block it is going to skip anyway.
jest.mock('google-sheet-cli/lib/lib/google-sheet', () =>
  process.env.TEST_SPREADSHEET_ID
    ? jest.requireActual('google-sheet-cli/lib/lib/google-sheet')
    : { __esModule: true, default: class {} }
);

const describeLive = process.env.TEST_SPREADSHEET_ID ? describe : describe.skip;

describeLive('main.ts', () => {
  it('should complete a run', async () => {
    commands = JSON.stringify([
      {
        command: 'addWorksheet',
        args: { worksheetTitle },
      },
      {
        command: 'updateData',
        args: { data: [['1', '2', '3']], minRow: 2 },
      },
    ]);
    const res: Results = await run();
    expect(core.setFailed).not.toHaveBeenCalled();
    expect(res.error).toBeUndefined();
    expect(res.results[0].command).toEqual({
      func: 'addWorksheet',
      kwargs: [worksheetTitle, undefined],
    });
    expect(res.results[0].result).toHaveProperty('properties');
    expect((res.results[0].result as any).properties.title).toBe(
      worksheetTitle
    );
    expect(res.results[1].command).toEqual({
      func: 'updateData',
      kwargs: [[['1', '2', '3']], { minRow: 2, worksheetTitle }, undefined],
    });
    expect(res.results[1].result).toBeUndefined();
    expect(core.debug).toHaveBeenCalled();
    expect(core.setOutput).toHaveBeenCalled();
  });

  it('should fail a run', async () => {
    commands = JSON.stringify([
      { command: 'wrongCommand', args: { worksheetTitle } },
      { command: 'updateData', args: { data: [['1', '2', '3']], minRow: 2 } },
    ]);
    const expectedError =
      'Command "wrongCommand" not found - must be one of: "addSpreadsheet", "getSpreadsheet", "addWorksheet", "getWorksheet", "removeWorksheet", "renameWorksheet", "updateData", "appendData", "getData"';
    const res: Results = await run();
    expect(res?.error?.message).toEqual(expectedError);
    expect(core.debug).not.toHaveBeenCalled();
    expect(core.setOutput).not.toHaveBeenCalled();
    expect(core.setFailed).toHaveBeenCalledWith(expectedError);
  });

  it('should remove a a worksheet', async () => {
    commands = JSON.stringify([
      { command: 'removeWorksheet', args: { worksheetTitle } },
    ]);
    const res: Results = await run();
    expect(core.setFailed).not.toHaveBeenCalled();
    expect(res.error).toBeUndefined();
    expect(res.results[0].command).toEqual({
      func: 'removeWorksheet',
      kwargs: [worksheetTitle, undefined],
    });
    expect(res.results[0].result).toBeUndefined();
    expect(core.debug).toHaveBeenCalled();
    expect(core.setOutput).toHaveBeenCalledWith(
      'results',
      `{"results":[{"command":{"func":"removeWorksheet","kwargs":["${worksheetTitle}",null]}}]}`
    );
  });

  afterAll(() => {
    jest.unmock('@actions/core');
  });
});
