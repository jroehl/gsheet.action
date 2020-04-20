"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("../config"));
const fs_1 = require("fs");
const path_1 = require("path");
const readmePath = path_1.resolve(__dirname, '..', '..', 'README.md');
const README = fs_1.readFileSync(readmePath, 'utf8');
const split = README.split('\n');
const start = split.findIndex(line => line.includes('<!-- commands -->')) + 1;
const end = split.findIndex(line => line.includes('<!-- commandsstop -->'));
const map = (array, required = true) => !array
    ? ''
    : `${array
        .map(key => {
        const { type, description, def } = config_1.default.descriptions[key];
        return `- ${required ? key : `[${key}${def ? `=${def}` : ''}]?`}:${type} - ${description}`;
    })
        .join('\n  ')}\n  `;
const commands = Object.values(config_1.default.commands)
    .map(({ func, args: { required, optional } = {}, options }) => `### ${func}

${config_1.default.commands[func].description}

- args
  ${map(required)}${map(optional, false)}${map(options, false)}`)
    .join('\n');
split.splice(start, end - start, commands);
fs_1.writeFileSync(readmePath, split.join('\n'));
