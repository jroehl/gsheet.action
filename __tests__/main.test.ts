import run, { Results } from '../src/main';
import * as core from '@actions/core';

const worksheetTitle = `test-action-${Date.now()}`;
let commands: string;

jest.mock('@actions/core', () => {
  return {
    getInput: jest.fn().mockImplementation(
      key =>
        ({
          spreadsheetId: process.env.TEST_SPREADSHEET_ID,
          commands,
        }[key])
    ),
    setOutput: jest.fn(),
    debug: jest.fn(),
    setFailed: jest.fn(),
  };
});

describe('main.ts', () => {
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
    expect(res.results[0].command).toEqual({ func: 'addWorksheet', kwargs: [worksheetTitle, undefined] });
    expect(res.results[0].result).toHaveProperty('properties');
    expect(res.results[0].result.properties.title).toBe(worksheetTitle);
    expect(res.results[1].command).toEqual({ func: 'updateData', kwargs: [[['1', '2', '3']], { minRow: 2, worksheetTitle }, undefined] });
    expect(res.results[1].result).toBeUndefined();
    expect(core.debug).toHaveBeenCalled();
    expect(core.setOutput).toHaveBeenCalled();
  });

  it('should fail a run', async () => {
    commands = JSON.stringify([
      { command: 'appendWorksheet', args: { worksheetTitle } },
      { command: 'updateData', args: { data: [['1', '2', '3']], minRow: 2 } },
    ]);
    const expectedError =
      'Command "appendWorksheet" not found - must be one of: "addSpreadsheet", "addWorksheet", "getWorksheet", "removeWorksheet", "updateData", "appendData", "getData", "getSpreadsheet"';
    const res: Results = await run();
    expect(res.error).toEqual(expectedError);
    expect(core.debug).not.toHaveBeenCalled();
    expect(core.setOutput).not.toHaveBeenCalled();
    expect(core.setFailed).toHaveBeenCalledWith(expectedError);
  });

  it('should remove a a worksheet', async () => {
    commands = JSON.stringify([{ command: 'removeWorksheet', args: { worksheetTitle } }]);
    const res: Results = await run();
    expect(core.setFailed).not.toHaveBeenCalled();
    expect(res.error).toBeUndefined();
    expect(res.results[0].command).toEqual({ func: 'removeWorksheet', kwargs: [worksheetTitle, undefined] });
    expect(res.results[0].result).toBeUndefined();
    expect(core.debug).toHaveBeenCalled();
    expect(core.setOutput).toHaveBeenCalledWith(
      'results',
      `{\"results\":[{\"command\":{\"func\":\"removeWorksheet\",\"kwargs\":[\"${worksheetTitle}\",null]}}]}`
    );
  });

  afterAll(() => {
    jest.unmock('@actions/core');
  });
});
