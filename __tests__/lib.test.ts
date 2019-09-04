import { validateCommands, asyncForEach } from '../src/lib';

const cmd = [
  {
    command: 'addWorksheet',
    args: { worksheetTitle: 'title' },
  },
  {
    command: 'updateData',
    args: { data: ['1', '2', '3'], minCol: 2 },
  },
];

describe('lib', () => {
  describe('validateCommands', () => {
    it('validates the command', () => {
      expect(validateCommands(JSON.stringify(cmd))).toEqual([
        { func: 'addWorksheet', kwargs: ['title', undefined] },
        { func: 'updateData', kwargs: [['1', '2', '3'], { minCol: 2 }, undefined] },
      ]);
    });

    it('fails the validation when command is wrong', () => {
      expect(() => validateCommands(JSON.stringify([{ command: 'wrongCommand', args: { foo: 'bar' } }]))).toThrowError(
        'Command "wrongCommand" not found - must be one of: "addSpreadsheet", "getSpreadsheet", "addWorksheet", "getWorksheet", "removeWorksheet", "updateData", "appendData", "getData"'
      );
    });

    it('fails the validation when arg is missing', () => {
      expect(() => validateCommands(JSON.stringify([{ command: 'addWorksheet', args: { foo: 'bar' } }]))).toThrowError(
        'Required arguments for "addWorksheet" missing: "worksheetTitle"'
      );
    });
  });

  describe('asyncForEach', () => {
    it('returns results of async operations in correct order', async () => {
      const results: Array<number> = [];
      const array = [1, 2, 3];
      await asyncForEach(array, async (x: number) => {
        await new Promise(resolve => {
          setTimeout(() => {
            results.push(x);
            resolve(x);
          }, 1);
        });
      });

      expect(results).toEqual(array);
    });
  });
});
