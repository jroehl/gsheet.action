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

      // v2 behavior: `[]` was passed straight through, `[].every(Array.isArray)`
      // is vacuously true and the CLI issued an empty update. Do not tighten
      // this - it is what keeps a workflow appending a dynamically built array
      // green on a day that produced no rows.
      it('passes empty data through, as v2 did', () => {
        expect(validateOne('updateData', { data: [] })[0]).toEqual([]);
      });

      it('passes empty data supplied as a JSON string through, as v2 did', () => {
        expect(validateOne('updateData', { data: '[]' })[0]).toEqual([]);
      });

      it('rejects data that is not an array of arrays', () => {
        expect(() => validateOne('updateData', { data: [1] })).toThrowError(
          'Argument "data" has to be an array of arrays'
        );
      });

      it('rejects data that is not an array at all', () => {
        expect(() =>
          validateOne('updateData', { data: '"nope"' })
        ).toThrowError('Argument "data" has to be an array of arrays');
      });

      it('coerces a numeric option to a number', () => {
        expect(
          validateOne('updateData', { data: [[1]], minCol: '2' })[1]
        ).toEqual({ minCol: 2 });
      });

      // v2 behavior: an empty value was forwarded untouched and the CLI's
      // `minRow || 1` / `maxCol || columnCount` read it as absent. An unset
      // `${{ steps.x.outputs.n }}` resolves to exactly this, so it must not
      // fail the step - the key is dropped instead.
      it('treats an empty numeric option as absent, as v2 did', () => {
        expect(
          validateOne('updateData', { data: [[1]], minCol: '' })[1]
        ).toEqual({});
      });

      it('treats a whitespace-only numeric option as absent, as v2 did', () => {
        expect(
          validateOne('getData', { minRow: ' ', maxCol: '\t' })[0]
        ).toEqual({});
      });

      it('treats a null numeric option as absent, as v2 did', () => {
        expect(validateOne('getData', { maxRow: null })[0]).toEqual({});
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

      // v2 behavior: plain JavaScript truthiness. #616 only needed the strings
      // "true" and "false" to stop both being truthy; everything else still
      // falls back to truthiness rather than failing the step.
      it('falls back to truthiness for a non canonical boolean, as v2 did', () => {
        expect(validateOne('getData', { hasHeaderRow: 'yes' })[0]).toEqual({
          hasHeaderRow: true,
        });
        expect(validateOne('getData', { hasHeaderRow: 1 })[0]).toEqual({
          hasHeaderRow: true,
        });
        expect(validateOne('getData', { hasHeaderRow: 0 })[0]).toEqual({
          hasHeaderRow: false,
        });
        expect(validateOne('getData', { hasHeaderRow: '' })[0]).toEqual({
          hasHeaderRow: false,
        });
      });

      it('keeps the explicit meaning of the boolean strings', () => {
        expect(validateOne('getData', { hasHeaderRow: 'true' })[0]).toEqual({
          hasHeaderRow: true,
        });
        expect(validateOne('getData', { hasHeaderRow: 'false' })[0]).toEqual({
          hasHeaderRow: false,
        });
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
