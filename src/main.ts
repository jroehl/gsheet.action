import { debug, getInput, setFailed, setOutput } from '@actions/core';
import GoogleSheet from 'google-sheet-cli/lib/lib/google-sheet';
import { ValidatedCommand, asyncForEach, validateCommands } from './lib';
import fs from 'fs';

export interface Result {
  command: ValidatedCommand;
  result: unknown;
}

export interface Results {
  results: Result[];
  error?: Error;
}

export default async function run(): Promise<Results> {
  try {
    const spreadsheetId: string = getInput('spreadsheetId', {
      required: true,
    });

    const { GSHEET_CLIENT_EMAIL, GSHEET_PRIVATE_KEY } = process.env;
    if (!GSHEET_CLIENT_EMAIL || !GSHEET_PRIVATE_KEY)
      throw new Error('Google sheets credentials have to be supplied');

    const gsheet = new GoogleSheet(spreadsheetId);
    await gsheet.authorize({
      /* eslint-disable camelcase */
      client_email: GSHEET_CLIENT_EMAIL,
      private_key: GSHEET_PRIVATE_KEY,
      /* eslint-enable camelcase */
    });

    const commandsString: string = getInput('commands', {
      required: true,
    });
    const validatedCommands = validateCommands(commandsString);

    const results: Result[] = [];
    await asyncForEach<ValidatedCommand>(
      validatedCommands,
      async (command: ValidatedCommand) => {
        const { func, kwargs } = command;
        const result = await gsheet[func](...kwargs);
        results.push({ command, result });
      }
    );

    const jsonData = JSON.stringify({ results });

    const { GSHEET_OUTPUT_PATH } = process.env;
    if (GSHEET_OUTPUT_PATH != null) {
      fs.writeFile(GSHEET_OUTPUT_PATH, jsonData, (err) => {
        if (err) {
          setFailed(err);
        } else {
          // eslint-disable-next-line i18n-text/no-en
          debug(`Data written to file ${GSHEET_OUTPUT_PATH}`);
        }
      });
    }

    setOutput('results', jsonData);
    // eslint-disable-next-line i18n-text/no-en
    debug(`Processed commands\n${JSON.stringify(results, null, 2)}`);
    return { results };
  } catch (error) {
    const err = error as Error;
    setFailed(err.message || err);
    return { error: err, results: [] };
  }
}

!process.env.TEST && run();