import config from './config';
import { Command, Arg } from './config';

export interface ActionCommand {
  command: string;
  args: Arg;
}

export interface ValidatedCommand {
  func: string;
  kwargs: any[];
}

/**
 * Asynchronous forEach loop
 *
 * @param {any[]} arr
 * @param {Function} callback
 * @returns {Promise<void>}
 */
export const asyncForEach = async (arr: any[], callback: Function): Promise<void> => {
  for (let i = 0; i < arr.length; i++) {
    await callback(arr[i], i, arr);
  }
};

/**
 * Helper to convert json strings to objects
 *
 * @param {string} arg
 * @returns {(string | object)}
 */
const initParse = (args: Arg): any => (arg: string): string | object => {
  try {
    return JSON.parse(args[arg]);
  } catch (_) {
    return args[arg];
  }
};

/**
 * Validate the commands as a string and return valid command array
 *
 * @param {string} commandString
 * @returns {ValidatedCommand[]}
 */
export const validateCommands = (commandString: string): ValidatedCommand[] => {
  let commands: ActionCommand[];
  try {
    commands = JSON.parse(commandString);
  } catch (err) {
    throw `"commands" input has to be valid JSON (${err.message})`;
  }
  const validated: Array<ValidatedCommand> = commands.map(({ command, args }) => {
    const trimmed = command.trim();
    const commandConfig: Command = config.commands[trimmed];
    if (!commandConfig) throw `Command "${trimmed}" not found - must be one of: "${Object.keys(config.commands).join('", "')}"`;

    const { func, args: { required = [], optional = [] } = {}, options } = commandConfig;

    const missingArgs = required.filter(arg => args[arg] === undefined);
    if (missingArgs.length) throw `Required arguments for "${trimmed}" missing: "${missingArgs.join('", "')}"`;

    const parse = initParse(args);
    let kwargs = [...required.map(parse), ...optional.map(parse)];
    if (options) {
      const parsedOptions = options.reduce((options, option) => (args[option] !== undefined ? { ...options, [option]: args[option] } : options), {});
      kwargs = [...required.map(parse), parsedOptions, ...optional.map(parse)];
    }

    return { func, kwargs };
  });

  return validated;
};
