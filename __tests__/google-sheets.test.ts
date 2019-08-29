import GoogleSheet from '../src/google-sheet';

const data = {
  new: [['A1', 'A2', 'A3', 'A4', 'A5'], ['B1', , 'B3', 'B4', 'B5', 'B6']],
  append: [['C1', 'C2', 'C3'], ['D1', 'D2', 'D3', 'D4', 'D5']],
};

describe('google-sheets', () => {
  let gsheet: GoogleSheet;
  const worksheetTitle = `test-google-sheets-${Date.now()}`;
  const { TEST_SPREADSHEET_ID = '', GSHEET_CLIENT_EMAIL = '', GSHEET_PRIVATE_KEY = '' } = process.env;

  beforeAll(async () => {
    // Create a new GoogleSheet instance and authorize
    gsheet = new GoogleSheet(TEST_SPREADSHEET_ID);
    expect(gsheet).toBeInstanceOf(GoogleSheet);
    await gsheet.authorize({
      client_email: GSHEET_CLIENT_EMAIL,
      private_key: GSHEET_PRIVATE_KEY,
    });
  });

  it('[1] creates a worksheet', async () => {
    await expect(gsheet.addWorksheet(worksheetTitle)).resolves.toHaveProperty('title', worksheetTitle);
  });

  it('[2] gets a worksheet', async () => {
    await expect(gsheet.getWorksheet(worksheetTitle)).resolves.toHaveProperty('title', worksheetTitle);
  });

  it('[3] updates data', async () => {
    await expect(gsheet.updateData(data.new)).resolves.toBeUndefined();
    await expect(gsheet.getCellData()).resolves.toEqual(data.new);
  });

  it('[4] appends data', async () => {
    await expect(gsheet.appendData(data.append)).resolves.toBeUndefined();
    await expect(gsheet.getCellData()).resolves.toEqual([...data.new, ...data.append]);
  });

  it('[5] removes worksheet', async () => {
    await expect(gsheet.removeWorksheet(worksheetTitle)).resolves.toBeUndefined();
  });
});
