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
 * Returning `undefined` means "treat the argument as absent" - the caller then
 * omits the key entirely instead of passing a value the CLI would misread.
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
      // v2 forwarded these untouched and the CLI's `minRow || 1` /
      // `maxCol || columnCount` read them as "not set". An expression such as
      // "${{ steps.x.outputs.n }}" that resolves to nothing has always been a
      // working input, so it stays one - Number('') would be 0 and silently
      // shift the range, which is why the value is dropped rather than parsed.
      if (value === null || (typeof value === 'string' && !value.trim()))
        return undefined;
      const parsed = typeof value === 'string' ? Number(value) : NaN;
      if (!Number.isFinite(parsed))
        throw new Error(`Argument "${arg}" must be a number`);
      return parsed;
    }
    case 'boolean': {
      if (typeof value === 'boolean') return value;
      if (value === 'true') return true;
      if (value === 'false') return false;
      // Everything else keeps the plain JavaScript truthiness v2 applied. The
      // only thing #616 needed was for the strings "true" and "false" to mean
      // what they say instead of both being truthy.
      return Boolean(value);
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
      if (args[arg] === undefined) continue;
      const value = coerce(arg, args[arg]);
      if (value !== undefined) coerced[arg] = value;
    }

    const data = coerced[Arg.data];
    // `[]` is deliberately allowed: v2 passed it through, `[].every` is
    // vacuously true, and the CLI turns it into a no-op. A workflow that
    // appends a dynamically built array must not go red on a quiet day.
    if (
      data !== undefined &&
      (!Array.isArray(data) || !data.every(Array.isArray))
    )
      throw new Error(`Argument "${Arg.data}" has to be an array of arrays`);

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
