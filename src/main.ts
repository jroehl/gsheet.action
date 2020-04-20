import * as core from '@actions/core';
import { validateCommands, asyncForEach, ValidatedCommand } from './lib';
import { GoogleSheet } from 'google-sheet-cli';

export interface Result {
  command: ValidatedCommand;
  result: any;
}

export interface Results {
  results: Result[];
  error?: Error;
}

export default async function run(): Promise<Results> {
  try {
    const spreadsheetId: string = core.getInput('spreadsheetId', { required: true });

    const { GSHEET_CLIENT_EMAIL, GSHEET_PRIVATE_KEY } = process.env;
    if (!GSHEET_CLIENT_EMAIL || !GSHEET_PRIVATE_KEY) throw 'Google sheets credentials have to be supplied';

    const gsheet = new GoogleSheet(spreadsheetId);
    await gsheet.authorize({
      client_email: GSHEET_CLIENT_EMAIL,
      private_key: GSHEET_PRIVATE_KEY,
    });

    const commandsString: string = core.getInput('commands', { required: true });
    const validatedCommands = validateCommands(commandsString);

    const results: Result[] = [];
    await asyncForEach(validatedCommands, async (command: ValidatedCommand) => {
      const { func, kwargs } = command;
      const result = await gsheet[func](...kwargs);
      results.push({ command, result });
    });

    core.setOutput('results', JSON.stringify({ results }));
    core.debug(`Processed commands\n${JSON.stringify(results, null, 2)}`);
    return { results };
  } catch (error) {
    core.setFailed(error.message || error);
    return { error, results: [] };
  }
}

!process.env.TEST && run();
