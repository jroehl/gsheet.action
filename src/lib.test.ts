import { asyncForEach, validateCommands } from './lib';

const cmd = [
  {
    command: 'addWorksheet',
    args: { worksheetTitle: 'title' },
  },
  {
    command: 'updateData',
    args: { data: [['1', '2', '3']], minCol: 2 },
  },
];

const validateOne = (command: string, args: Record<string, unknown>): any[] =>
  validateCommands(JSON.stringify([{ command, args }]))[0].kwargs;

describe('lib', () => {
  describe('validateCommands', () => {
    it('validates the command', () => {
      expect(validateCommands(JSON.stringify(cmd))).toEqual([
        { func: 'addWorksheet', kwargs: ['title', undefined] },
        {
          func: 'updateData',
          kwargs: [[['1', '2', '3']], { minCol: 2 }, undefined],
        },
      ]);
    });

    it('fails the validation when command is wrong', () => {
      expect(() =>
        validateCommands(
          JSON.stringify([{ command: 'wrongCommand', args: { foo: 'bar' } }])
        )
      ).toThrowError(
        'Command "wrongCommand" not found - must be one of: "addSpreadsheet", "getSpreadsheet", "addWorksheet", "getWorksheet", "removeWorksheet", "renameWorksheet", "updateData", "appendData", "getData"'
      );
    });

    it('fails the validation when arg is missing', () => {
      expect(() =>
        validateCommands(
          JSON.stringify([{ command: 'addWorksheet', args: { foo: 'bar' } }])
        )
      ).toThrowError(
        'Required arguments for "addWorksheet" missing: "worksheetTitle"'
      );
    });

    describe('argument coercion', () => {
      it('keeps data that is already a nested array', () => {
        expect(validateOne('updateData', { data: [[1]] })[0]).toEqual([[1]]);
      });

      it('keeps the cell types of data untouched', () => {
        expect(validateOne('updateData', { data: [['42']] })[0]).toEqual([
          ['42'],
        ]);
      });

      it('parses data supplied as a JSON string', () => {
        expect(validateOne('updateData', { data: '[[1]]' })[0]).toEqual([[1]]);
      });

      it('rejects data that is not valid JSON', () => {
        expect(() => validateOne('updateData', { data: 'nope' })).toThrowError(
          'Argument "data" has to be valid JSON'
        );
      });

      it('rejects empty data', () => {
        expect(() => validateOne('updateData', { data: [] })).toThrowError(
          'Argument "data" has to be a non-empty array of arrays'
        );
      });

      it('rejects data that is not an array of arrays', () => {
        expect(() => validateOne('updateData', { data: [1] })).toThrowError(
          'Argument "data" has to be a non-empty array of arrays'
        );
      });

      it('coerces a numeric option to a number', () => {
        expect(
          validateOne('updateData', { data: [[1]], minCol: '2' })[1]
        ).toEqual({ minCol: 2 });
      });

      it('rejects an empty string for a numeric option', () => {
        expect(() =>
          validateOne('updateData', { data: [[1]], minCol: '' })
        ).toThrowError('Argument "minCol" must be a number');
      });

      it('rejects a non numeric string for a numeric option', () => {
        expect(() =>
          validateOne('updateData', { data: [[1]], minCol: 'abc' })
        ).toThrowError('Argument "minCol" must be a number');
      });

      it('coerces a boolean option to a boolean', () => {
        expect(validateOne('getData', { hasHeaderRow: 'false' })[0]).toEqual({
          hasHeaderRow: false,
        });
      });

      it('rejects a value that is neither true nor false', () => {
        expect(() =>
          validateOne('getData', { hasHeaderRow: 'yes' })
        ).toThrowError('Argument "hasHeaderRow" must be true or false');
      });

      it('keeps a numeric worksheet title a string', () => {
        expect(validateOne('addWorksheet', { worksheetTitle: '2026' })[0]).toBe(
          '2026'
        );
      });

      it('keeps a range with a quoted worksheet title a string', () => {
        expect(validateOne('getData', { range: "'2026'!A2:B3" })[0]).toEqual({
          range: "'2026'!A2:B3",
        });
      });
    });
  });

  describe('asyncForEach', () => {
    it('returns results of async operations in correct order', async () => {
      const results: number[] = [];
      const array = [1, 2, 3];
      await asyncForEach(array, async (x: number) => {
        await new Promise((resolve) => {
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
