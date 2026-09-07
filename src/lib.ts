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
 * Convert an argument value to the type its descriptor declares
 *
 * @param {string} arg
 * @param {unknown} value
 * @returns {unknown}
 */
const coerce = (arg: string, value: unknown): unknown => {
  const { type } = config.descriptions[arg];
  switch (type) {
    case 'number': {
      if (typeof value === 'number') return value;
      // Number('') and Number(' ') are 0, which would silently shift a range
      const parsed =
        typeof value === 'string' && value.trim() ? Number(value) : NaN;
      if (!Number.isFinite(parsed))
        throw new Error(`Argument "${arg}" must be a number`);
      return parsed;
    }
    case 'boolean': {
      if (typeof value === 'boolean') return value;
      if (value === 'true') return true;
      if (value === 'false') return false;
      throw new Error(`Argument "${arg}" must be true or false`);
    }
    case 'json': {
      if (typeof value === 'object' && value !== null) return value;
      try {
        return JSON.parse(value as string);
      } catch (err) {
        throw new Error(
          `Argument "${arg}" has to be valid JSON (${(err as Error).message})`
        );
      }
    }
    default:
      // "string" and anything without a declared type is passed through
      return value;
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
      options = [],
    } = commandConfig;

    const missingArgs = required.filter((arg) => args[arg] === undefined);
    if (missingArgs.length)
      throw new Error(
        `Required arguments for "${trimmed}" missing: "${missingArgs.join(
          '", "'
        )}"`
      );

    const coerced: { [arg: string]: unknown } = {};
    for (const arg of [...required, ...optional, ...options]) {
      if (args[arg] !== undefined) coerced[arg] = coerce(arg, args[arg]);
    }

    const data = coerced[Arg.data];
    if (
      data !== undefined &&
      (!Array.isArray(data) || !data.length || !data.every(Array.isArray))
    )
      throw new Error(
        `Argument "${Arg.data}" has to be a non-empty array of arrays`
      );

    const collectedOptions = options.reduce(
      (acc, option) =>
        coerced[option] !== undefined
          ? { ...acc, [option]: coerced[option] }
          : acc,
      {}
    );

    const kwargs = [
      ...required.map((arg) => coerced[arg]),
      ...(commandConfig.options ? [collectedOptions] : []),
      ...optional.map((arg) => coerced[arg]),
    ];

    return { func, kwargs };
  });

  return validated;
};
