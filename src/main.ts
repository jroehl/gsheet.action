import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import {
  debug,
  getInput,
  notice,
  setFailed,
  setOutput,
  warning,
} from '@actions/core';
import GoogleSheet from 'google-sheet-cli/lib/lib/google-sheet';
import { ValidatedCommand, asyncForEach, validateCommands } from './lib';

// GitHub caps what a step may hand to the next one. Above this the results are
// replaced by a pointer to "outputFile", but only when that file was written -
// the file is then the complete record, so nothing is lost.
// GitHub caps an output at 1 MB and says the size is "approximated based on UTF-16
// encoding", so the budget is in UTF-16 code units - which is what String.length counts.
// Buffer.byteLength would measure UTF-8 and let an ASCII result twice this size through.
const MAX_OUTPUT_BYTES = 1000000;
const MAX_OUTPUT_UNITS = MAX_OUTPUT_BYTES / 2;

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

    const output = JSON.stringify({ results });

    const outputFile: string = getInput('outputFile', {
      required: false,
    });
    let outputFileWritten = false;
    if (outputFile) {
      try {
        mkdirSync(dirname(outputFile), { recursive: true });
        writeFileSync(outputFile, output);
        outputFileWritten = true;
      } catch (error) {
        // Every command has already run by now, so failing the step here would lose the
        // record of writes that did happen - which is the opposite of what this input is for.
        warning(
          // eslint-disable-next-line i18n-text/no-en
          `Could not write the results to "${outputFile}": ${
            (error as Error).message
          }`
        );
      }
    }

    if (output.length < MAX_OUTPUT_UNITS) {
      setOutput('results', output);
    } else if (outputFileWritten) {
      notice(
        `The results exceed ${MAX_OUTPUT_BYTES} bytes - the "results" output points at "${outputFile}", which holds all of them`
      );
      setOutput('results', JSON.stringify({ outputFile, truncated: true }));
    } else {
      warning(
        `The results exceed ${MAX_OUTPUT_BYTES} bytes - set the "outputFile" input to receive them as a file, GitHub may refuse an output this large`
      );
      setOutput('results', output);
    }
    debug(`Processed commands\n${JSON.stringify(results, null, 2)}`);
    return { results };
  } catch (error) {
    const err = error as Error;
    setFailed(err.message || err);
    return { error: err, results: [] };
  }
}

!process.env.TEST && run();
