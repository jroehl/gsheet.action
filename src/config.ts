export enum Arg {
  worksheetTitle = 'worksheetTitle',
  data = 'data',
  row = 'row',
  minRow = 'minRow',
  maxRow = 'maxRow',
  col = 'col',
  minCol = 'minCol',
  maxCol = 'maxCol',
}

export enum Func {
  addWorksheet = 'addWorksheet',
  getWorksheet = 'getWorksheet',
  removeWorksheet = 'removeWorksheet',
  updateData = 'updateData',
  appendData = 'appendData',
  getCellData = 'getCellData',
  getInfo = 'getInfo',
}

const defaultRequired = [Arg.worksheetTitle];

export default {
  commands: {
    [Func.addWorksheet]: {
      func: Func.addWorksheet,
      args: { required: defaultRequired },
    },
    [Func.getWorksheet]: {
      func: Func.getWorksheet,
      args: { required: defaultRequired },
    },
    [Func.removeWorksheet]: {
      func: Func.removeWorksheet,
      args: { required: defaultRequired },
    },
    [Func.updateData]: {
      func: Func.updateData,
      args: {
        required: [Arg.data],
        optional: [Arg.row, Arg.col],
      },
    },
    [Func.appendData]: {
      func: Func.appendData,
      args: {
        required: [Arg.data],
        optional: [Arg.col],
      },
    },
    [Func.getCellData]: {
      func: Func.getCellData,
      args: {
        optional: [Arg.minRow, Arg.minCol, Arg.maxRow, Arg.maxCol],
      },
    },
    [Func.getInfo]: {
      func: Func.getInfo,
    },
  },
};
