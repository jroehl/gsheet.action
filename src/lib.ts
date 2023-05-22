import config, { Arg, Command } from './config';

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
export const asyncForEach = async <T>(
  arr: T[],
  callback: (value: T, index: number, array: T[]) => Promise<void>
): Promise<void> => {
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
const initParse =
  (args: Arg) =>
  (arg: string): string | Record<string, unknown> => {
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
    throw new Error(
      `"commands" input has to be valid JSON (${(err as Error).message})`
    );
  }
  const validated: ValidatedCommand[] = commands.map(({ command, args }) => {
    const trimmed = command.trim();
    const commandConfig: Command = config.commands[trimmed];
    if (!commandConfig)
      throw new Error(
        `Command "${trimmed}" not found - must be one of: "${Object.keys(
          config.commands
        ).join('", "')}"`
      );

    const {
      func,
      args: { required = [], optional = [] } = {},
      options,
    } = commandConfig;

    const missingArgs = required.filter((arg) => args[arg] === undefined);
    if (missingArgs.length)
      throw new Error(
        `Required arguments for "${trimmed}" missing: "${missingArgs.join(
          '", "'
        )}"`
      );

    const parse = initParse(args);
    let kwargs = [...required.map(parse), ...optional.map(parse)];
    if (options) {
      const parsedOptions = options.reduce(
        (acc, option) =>
          args[option] !== undefined ? { ...acc, [option]: args[option] } : acc,
        {}
      );
      kwargs = [...required.map(parse), parsedOptions, ...optional.map(parse)];
    }

    return { func, kwargs };
  });

  return validated;
};
