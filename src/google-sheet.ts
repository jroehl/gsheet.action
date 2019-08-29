import GoogleSpreadsheet from 'google-spreadsheet';
import { promisify } from 'util';
import { asyncForEach } from './lib';

export interface Credentials {
  client_email: string;
  private_key: string;
}

export default class GoogleSheet {
  private doc;
  private worksheet;

  /**
   * Creates an instance of GoogleSheets.
   * @param {string} spreadsheetId
   */
  constructor(spreadsheetId: string) {
    if (!spreadsheetId) throw 'Spreadsheet id has to be specified';
    this.doc = new GoogleSpreadsheet(spreadsheetId);
  }

  /**
   * Authorize with credentials
   *
   * @param {Credentials} creds
   * @returns {GoogleSheet}
   */
  async authorize(creds: Credentials) {
    creds.private_key = creds.private_key.replace(/\\n/g, '\n');

    const useServiceAccountAuth = promisify(this.doc.useServiceAccountAuth);
    await useServiceAccountAuth(creds);
    return this;
  }

  /**
   * Get information about the spreadsheet.
   * @returns {Promise<object>}
   */
  async getInfo() {
    const getInfo = promisify(this.doc.getInfo);
    const info = await getInfo();
    return info;
  }

  /**
   * Append row data to a worksheet, starting after the last row in a specific column
   *
   * @param {Array<Array<any>>} data //[['A1', 'A2', 'A3', 'A4', 'A5'], ['B1', 'B2', 'B3', 'B4', 'B5', 'B6']];
   * @param {number} [col=1]
   */
  async appendData(data: Array<Array<any>>, col = 1) {
    if (!this.worksheet) throw 'Select or add worksheet first';
    const getCells = promisify(this.worksheet.getCells);
    const cells = await getCells({
      'min-col': col,
      'max-col': col,
    });
    await this.updateData(data, cells.length + 1, col);
  }

  /**
   * Update the data starting at a specific row and column
   *
   * @param {Array<Array<any>>} data //[['A1', 'A2', 'A3', 'A4', 'A5'], ['B1', 'B2', 'B3', 'B4', 'B5', 'B6']];
   * @param {number} [row=1]
   * @param {number} [col=1]
   */
  async updateData(data: Array<Array<any>>, row = 1, col = 1) {
    if (!this.worksheet) throw 'Select or add worksheet first';
    if (!Array.isArray(data)) throw 'Check "data" property - has to be supplied as nested array ([["1", "2"], ["3", "4"]])';
    const getCells = promisify(this.worksheet.getCells);
    const bulkUpdateCells = promisify(this.worksheet.bulkUpdateCells);
    await asyncForEach(data, async (rowValue = [], y) => {
      if (!Array.isArray(rowValue)) throw 'Check "data" "row" property - has to be supplied as nested array ([["1", "2"], ["3", "4"]])';
      const minRow = row + y;
      const cells = await getCells({
        'min-row': minRow,
        'max-row': minRow + 1,
        'min-col': col,
        'max-col': rowValue.length + (col - 1),
        'return-empty': true,
      });
      await rowValue.forEach((cellValue = '', x) => {
        const cell = cells[x];
        cell.value = cellValue;
      });
      await bulkUpdateCells(cells);
    });
  }

  /**
   * Get the data of the specified cells (or every available cell data)
   *
   * @param {number} [minRow=1]
   * @param {number} [minCol=1]
   * @param {number} [maxRow]
   * @param {number} [maxCol]
   * @returns {Array<Array<any>>}
   */
  async getCellData(minRow: number = 1, minCol: number = 1, maxRow?: number, maxCol?: number) {
    if (!this.worksheet) throw 'Select or add worksheet first';
    const getCells = promisify(this.worksheet.getCells);

    const limits = {};
    if (!isNaN(minRow)) limits['min-row'] = minRow;
    if (!isNaN(minCol)) limits['min-col'] = minCol;
    if (maxRow && !isNaN(maxRow)) limits['max-row'] = maxRow;
    if (maxCol && !isNaN(maxCol)) limits['max-col'] = maxCol;

    const cells = await getCells(limits);
    const values: Array<Array<any>> = cells.reduce((rows, { row, col, value }) => {
      const rowIndex = row - 1;
      const colIndex = col - 1;
      if (!rows[rowIndex]) rows[rowIndex] = [];
      rows[rowIndex][colIndex] = value;
      return rows;
    }, []);
    return values;
  }

  /**
   * Get a worksheet by title
   *
   * @param {string} title
   * @returns {Promise<GoogleSpreadsheet.worksheet>}
   */
  async getWorksheet(title) {
    const { worksheets } = await this.getInfo();
    this.worksheet = worksheets.find(sheet => sheet.title === title);
    return this.worksheet;
  }

  /**
   * Add a worksheet with title
   *
   * @param {string} title
   * @returns {Promise<stGoogleSpreadsheet.worksheet>}
   */
  async addWorksheet(title: string) {
    const sheet = await new Promise((resolve, reject) => {
      this.doc.addWorksheet({ title }, (err, sheet) => {
        err ? reject(err) : resolve(sheet);
      });
    });
    this.worksheet = sheet;
    return sheet;
  }

  /**
   * Remove a worksheet by title
   *
   * @param {string} title
   */
  async removeWorksheet(title: string) {
    const sheet = await this.getWorksheet(title);
    await new Promise((resolve, reject) => {
      this.doc.removeWorksheet(sheet, err => {
        err ? reject(err) : resolve();
      });
    });
    this.worksheet = null;
  }
}
