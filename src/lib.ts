import config from './config';

interface Args {
  worksheetTitle?: string;
  data?: Array<Array<any>>;
  row?: number;
  minRow?: number;
  maxRow?: number;
  col?: number;
  minCol?: number;
  maxCol?: number;
}

interface Command {
  command: string;
  args: Args;
}

/**
 * Asynchronous forEach loop
 *
 * @param {Array<any>} arr
 * @param {function} callback
 */
export const asyncForEach = async (arr, callback) => {
  for (let i = 0; i < arr.length; i++) {
    await callback(arr[i], i, arr);
  }
};

/**
 * Helper to convert json strings to objects
 *
 * @param {Args} args
 * @returns {string|object}
 */
const initParse = args => arg => {
  try {
    return JSON.parse(args[arg]);
  } catch (_) {
    return args[arg];
  }
};

export interface ValidatedCommand {
  func: string;
  kwargs: Array<any>;
}

/**
 * Validate the commands as a string and return valid command array
 *
 * @param {string} commandString
 * @returns {Array<ValidatedCommand>}
 */
export const validateCommands = commandsString => {
  let commands: Array<Command>;
  try {
    commands = JSON.parse(commandsString);
  } catch (err) {
    throw `"commands" input has to be valid JSON (${err.message})`;
  }
  const validated: Array<ValidatedCommand> = commands.map(({ command, args }) => {
    const trimmed = command.trim();
    const commandConfig = config.commands[trimmed];
    if (!commandConfig) throw `Command "${trimmed}" not found - must be one of: "${Object.keys(config.commands).join('", "')}"`;

    const { func, args: { required = [], optional = [] } = {} } = commandConfig;

    const missingArgs = required.filter(arg => !args[arg]);
    if (missingArgs.length) throw `Required arguments for "${trimmed}" missing: "${missingArgs.join('", "')}"`;

    const parse = initParse(args);
    const kwargs = [...required.map(parse), ...optional.map(parse)];

    return { func, kwargs };
  });

  return validated;
};
