export enum Arg {
  worksheetTitle = 'worksheetTitle',
  newWorksheetTitle = 'newWorksheetTitle',
  spreadsheetId = 'spreadsheetId',
  spreadsheetTitle = 'spreadsheetTitle',
  valueInputOption = 'valueInputOption',
  data = 'data',
  range = 'range',
  minRow = 'minRow',
  maxRow = 'maxRow',
  minCol = 'minCol',
  maxCol = 'maxCol',
  hasHeaderRow = 'hasHeaderRow',
}

interface Description {
  type: string;
  description: string;
  def?: string;
}

const descriptions: { [arg: string]: Description } = {
  [Arg.worksheetTitle]: {
    type: 'string',
    description:
      'The title of the worksheet (needed if no previous command set the worksheetTitle globally)',
  },
  [Arg.newWorksheetTitle]: {
    type: 'string',
    description: 'The new title of the worksheet',
  },
  [Arg.spreadsheetId]: {
    type: 'string',
    description:
      'The id of the spreadsheet (needed if no previous command set the spreadsheetId globally)',
  },
  [Arg.spreadsheetTitle]: {
    type: 'string',
    description: 'The title of the worksheet',
  },
  [Arg.valueInputOption]: {
    type: 'string',
    description: 'The input value to be used',
    def: 'RAW',
  },
  [Arg.data]: {
    type: 'string',
    description:
      'The data to be used as a JSON string - nested array [["1", "2", "3"]]',
  },
  [Arg.range]: {
    type: 'string',
    description: 'Range in a1 notation to be used for the operation',
  },
  [Arg.minCol]: {
    type: 'number',
    description: 'Starting column of the operation',
    def: '1',
  },
  [Arg.minRow]: {
    type: 'number',
    description: 'Starting row of the operation',
    def: '1',
  },
  [Arg.maxCol]: {
    type: 'number',
    description: 'Last column of the operation',
  },
  [Arg.maxRow]: {
    type: 'number',
    description: 'Last row of the operation',
  },
  [Arg.hasHeaderRow]: {
    type: 'boolean',
    description: 'If the first row should be treated as header row',
  },
};

export enum Func {
  addWorksheet = 'addWorksheet',
  getWorksheet = 'getWorksheet',
  getSpreadsheet = 'getSpreadsheet',
  removeWorksheet = 'removeWorksheet',
  renameWorksheet = 'renameWorksheet',
  updateData = 'updateData',
  appendData = 'appendData',
  getData = 'getData',
  addSpreadsheet = 'addSpreadsheet',
  getSpreadsheetInfo = 'getSpreadsheetInfo',
}

export interface Command {
  func: Func;
  description: string;
  args?: {
    required?: Arg[];
    optional?: Arg[];
  };
  options?: Arg[];
}

const config: {
  commands: { [func: string]: Command };
  descriptions: { [arg: string]: Description };
} = {
  descriptions,
  commands: {
    [Func.addSpreadsheet]: {
      func: Func.addSpreadsheet,
      description:
        'Add a spreadsheet with the specified title to the spreadsheet',
      args: {
        required: [Arg.spreadsheetTitle],
      },
    },
    [Func.getSpreadsheet]: {
      func: Func.getSpreadsheet,
      description: 'Get a spreadsheet with the specified title',
      args: {
        optional: [Arg.spreadsheetId],
      },
    },
    [Func.addWorksheet]: {
      func: Func.addWorksheet,
      description:
        'Add a worksheet with the specified title to the spreadsheet',
      args: {
        required: [Arg.worksheetTitle],
        optional: [Arg.spreadsheetId],
      },
    },
    [Func.getWorksheet]: {
      func: Func.getWorksheet,
      description: 'Get a worksheet with the specified title',
      args: {
        required: [Arg.worksheetTitle],
        optional: [Arg.spreadsheetId],
      },
    },
    [Func.removeWorksheet]: {
      func: Func.removeWorksheet,
      description: 'Remove an existing worksheet with the specified title',
      args: {
        required: [Arg.worksheetTitle],
        optional: [Arg.spreadsheetId],
      },
    },
    [Func.renameWorksheet]: {
      func: Func.renameWorksheet,
      description: 'Rename an existing worksheet to the specified title',
      args: {
        required: [Arg.worksheetTitle, Arg.newWorksheetTitle],
        optional: [Arg.spreadsheetId],
      },
    },
    [Func.updateData]: {
      func: Func.updateData,
      description:
        'Updates cells with the specified data (at the specified range)',
      args: {
        required: [Arg.data],
        optional: [Arg.spreadsheetId],
      },
      options: [
        Arg.minRow,
        Arg.minCol,
        Arg.range,
        Arg.valueInputOption,
        Arg.worksheetTitle,
      ],
    },
    [Func.appendData]: {
      func: Func.appendData,
      description:
        'Append cells with the specified data after the last row (in starting col)',
      args: {
        required: [Arg.data],
        optional: [Arg.spreadsheetId],
      },
      options: [
        Arg.minCol,
        Arg.range,
        Arg.valueInputOption,
        Arg.worksheetTitle,
      ],
    },
    [Func.getData]: {
      func: Func.getData,
      description: 'Get cell data (within specified range)',
      args: {
        optional: [Arg.spreadsheetId],
      },
      options: [
        Arg.minRow,
        Arg.minCol,
        Arg.maxRow,
        Arg.maxCol,
        Arg.range,
        Arg.hasHeaderRow,
        Arg.worksheetTitle,
      ],
    },
  },
};

export default config;
