import run from '../src/main';
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
    commands = JSON.stringify([{ command: 'addWorksheet', args: { worksheetTitle } }, { command: 'updateData', args: { data: [['1', '2', '3']], row: 2 } }]);
    await expect(run()).resolves.toBeDefined();
    expect(core.debug).toHaveBeenCalled();
    expect(core.setOutput).toHaveBeenCalled();
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('should fail a run', async () => {
    commands = JSON.stringify([{ command: 'appendWorksheet', args: { worksheetTitle } }, { command: 'updateData', args: { data: [['1', '2', '3']], row: 2 } }]);
    await expect(run()).resolves.toBeUndefined();
    expect(core.debug).not.toHaveBeenCalled();
    expect(core.setOutput).not.toHaveBeenCalled();
    expect(core.setFailed).toHaveBeenCalledWith(
      'Command "appendWorksheet" not found - must be one of: "addWorksheet", "getWorksheet", "removeWorksheet", "updateData", "appendData", "getCellData", "getInfo"'
    );
  });

  it('should remove a a worksheet', async () => {
    commands = JSON.stringify([{ command: 'removeWorksheet', args: { worksheetTitle } }]);
    await expect(run()).resolves.toBeDefined();
    expect(core.debug).toHaveBeenCalled();
    expect(core.setOutput).toHaveBeenCalledWith('results', `[{\"command\":{\"func\":\"removeWorksheet\",\"kwargs\":[\"${worksheetTitle}\"]}}]`);
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  afterAll(() => {
    jest.unmock('@actions/core');
  });
});
