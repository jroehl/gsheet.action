# gsheet.action

A github action to help with CRUD operations on google sheets.

- [gsheet.action](#gsheetaction)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Setup in github action workflow (v2)](#setup-in-github-action-workflow-v2)
  - [Supported commands](#supported-commands)
    - [addSpreadsheet](#addspreadsheet)
    - [getSpreadsheet](#getspreadsheet)
    - [addWorksheet](#addworksheet)
    - [getWorksheet](#getworksheet)
    - [removeWorksheet](#removeworksheet)
    - [updateData](#updatedata)
    - [appendData](#appenddata)
    - [getData](#getdata)
  - [Build with](#build-with)
  - [Contributing](#contributing)
  - [Versioning](#versioning)
  - [License](#license)

## Getting Started

### Prerequisites

Secrets required as environment variables

- GSHEET_CLIENT_EMAIL (email of the service account that has permission to access the spreadsheet)
- GSHEET_PRIVATE_KEY (private key of the service account that has permission to access the spreadsheet)

### Setup in github action workflow (v2)

```yaml
name: gsheet.action test
on: push

jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - id: 'update_worksheet'
        uses: jroehl/gsheet.action@v1.0.0 # you can specify '@release' to always have the latest changes
        with:
          spreadsheetId: <spreadsheetId>
          commands: | # list of commands, specified as a valid JSON string
            [
              { "command": "addWorksheet", "args": { "worksheetTitle": "<worksheetTitle>" }},
              { "command": "updateData", "args": { "data": [["A1", "A2", "A3"]] }},
              { "command": "getData", "args": { "range": "'<worksheetTitle>'!A2:B3" } }
            ]
        env:
          GSHEET_CLIENT_EMAIL: ${{ secrets.GSHEET_CLIENT_EMAIL }}
          GSHEET_PRIVATE_KEY: ${{ secrets.GSHEET_PRIVATE_KEY }}
      - name: dump results
        env:
          #  the output of the action can be found in ${{ steps.update_worksheet.outputs.results }}
          RESULTS: ${{ steps.update_worksheet.outputs.results }}
        run: echo "$RESULTS" | jq
```

> See ./github/workflows/e2e.yml for another example.

## Supported commands
<!-- commands -->
### addSpreadsheet

Add a spreadsheet with the specified title to the spreadsheet

- args
  - spreadsheetTitle:string - The title of the worksheet
  
### getSpreadsheet

Get a spreadsheet with the specified title

- args
  - [spreadsheetId]?:string - The id of the spreadsheet (needed if no previous command set the spreadsheetId globally)
  
### addWorksheet

Add a worksheet with the specified title to the spreadsheet

- args
  - worksheetTitle:string - The title of the worksheet (needed if no previous command set the worksheetTitle globally)
  - [spreadsheetId]?:string - The id of the spreadsheet (needed if no previous command set the spreadsheetId globally)
  
### getWorksheet

Get a worksheet with the specified title

- args
  - worksheetTitle:string - The title of the worksheet (needed if no previous command set the worksheetTitle globally)
  - [spreadsheetId]?:string - The id of the spreadsheet (needed if no previous command set the spreadsheetId globally)
  
### removeWorksheet

Remove an existing worksheet with the specified title

- args
  - worksheetTitle:string - The title of the worksheet (needed if no previous command set the worksheetTitle globally)
  - [spreadsheetId]?:string - The id of the spreadsheet (needed if no previous command set the spreadsheetId globally)
  
### updateData

Updates cells with the specified data (at the specified range)

- args
  - data:string - The data to be used as a JSON string - nested array [["1", "2", "3"]]
  - [spreadsheetId]?:string - The id of the spreadsheet (needed if no previous command set the spreadsheetId globally)
  - [minRow=1]?:number - Starting row of the operation
  - [minCol=1]?:number - Starting row of the operation
  - [range]?:string - Range in a1 notation to be used for the operation
  - [valueInputOption=RAW]?:string - The input value to be used
  - [worksheetTitle]?:string - The title of the worksheet (needed if no previous command set the worksheetTitle globally)
  
### appendData

Append cells with the specified data after the last row (in starting col)

- args
  - data:string - The data to be used as a JSON string - nested array [["1", "2", "3"]]
  - [spreadsheetId]?:string - The id of the spreadsheet (needed if no previous command set the spreadsheetId globally)
  - [minCol=1]?:number - Starting row of the operation
  - [range]?:string - Range in a1 notation to be used for the operation
  - [valueInputOption=RAW]?:string - The input value to be used
  - [worksheetTitle]?:string - The title of the worksheet (needed if no previous command set the worksheetTitle globally)
  
### getData

Get cell data (within specified range)

- args
  - [spreadsheetId]?:string - The id of the spreadsheet (needed if no previous command set the spreadsheetId globally)
  - [minRow=1]?:number - Starting row of the operation
  - [minCol=1]?:number - Starting row of the operation
  - [maxRow]?:number - Last row of the operation
  - [maxCol]?:number - Last row of the operation
  - [range]?:string - Range in a1 notation to be used for the operation
  - [hasHeaderRow]?:boolean - If the first row should be treated as header row
  - [worksheetTitle]?:string - The title of the worksheet (needed if no previous command set the worksheetTitle globally)
  
<!-- commandsstop -->

## Build with

- [google-sheet-cli](https://github.com/jroehl/google-sheet-cli/) - The node module used for manipulating the google sheet
- [semantic-release](https://github.com/semantic-release/semantic-release) - for releasing new versions
- [typescript](https://www.typescriptlang.org)

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/jroehl/gsheet.action/tags).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
