"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("./config"));
/**
 * Asynchronous forEach loop
 *
 * @param {any[]} arr
 * @param {Function} callback
 * @returns {Promise<void>}
 */
exports.asyncForEach = (arr, callback) => __awaiter(void 0, void 0, void 0, function* () {
    for (let i = 0; i < arr.length; i++) {
        yield callback(arr[i], i, arr);
    }
});
/**
 * Helper to convert json strings to objects
 *
 * @param {string} arg
 * @returns {(string | object)}
 */
const initParse = (args) => (arg) => {
    try {
        return JSON.parse(args[arg]);
    }
    catch (_) {
        return args[arg];
    }
};
/**
 * Validate the commands as a string and return valid command array
 *
 * @param {string} commandString
 * @returns {ValidatedCommand[]}
 */
exports.validateCommands = (commandString) => {
    let commands;
    try {
        commands = JSON.parse(commandString);
    }
    catch (err) {
        throw `"commands" input has to be valid JSON (${err.message})`;
    }
    const validated = commands.map(({ command, args }) => {
        const trimmed = command.trim();
        const commandConfig = config_1.default.commands[trimmed];
        if (!commandConfig)
            throw `Command "${trimmed}" not found - must be one of: "${Object.keys(config_1.default.commands).join('", "')}"`;
        const { func, args: { required = [], optional = [] } = {}, options } = commandConfig;
        const missingArgs = required.filter(arg => args[arg] === undefined);
        if (missingArgs.length)
            throw `Required arguments for "${trimmed}" missing: "${missingArgs.join('", "')}"`;
        const parse = initParse(args);
        let kwargs = [...required.map(parse), ...optional.map(parse)];
        if (options) {
            const parsedOptions = options.reduce((options, option) => (args[option] !== undefined ? Object.assign(Object.assign({}, options), { [option]: args[option] }) : options), {});
            kwargs = [...required.map(parse), parsedOptions, ...optional.map(parse)];
        }
        return { func, kwargs };
    });
    return validated;
};
