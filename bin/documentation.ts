import config from '../src/config';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const readmePath = resolve(__dirname, '..', '..', 'README.md');
const README = readFileSync(readmePath, 'utf8');
const split = README.split('\n');
const start = split.findIndex(line => line.includes('<!-- commands -->')) + 1;
const end = split.findIndex(line => line.includes('<!-- commandsstop -->'));

const map = (array?: string[], required: boolean = true): string =>
  !array
    ? ''
    : `${array
        .map(key => {
          const { type, description, def } = config.descriptions[key];
          return `- ${required ? key : `[${key}${def ? `=${def}` : ''}]?`}:${type} - ${description}`;
        })
        .join('\n  ')}\n  `;

const commands = Object.values(config.commands)
  .map(
    ({ func, args: { required, optional } = {}, options }) => `### ${func}

${config.commands[func].description}

- args
  ${map(required)}${map(optional, false)}${map(options, false)}`
  )
  .join('\n');

split.splice(start, end - start, commands);
writeFileSync(readmePath, split.join('\n'));
