# gsheet.action

A github action to help with CRUD operations on google sheets.

- [gsheet.action](#gsheetaction)
  - [Usage](#usage)
    - [Secrets required as environment variables](#secrets-required-as-environment-variables)
    - [Setup in github action workflow (v2)](#setup-in-github-action-workflow-v2)
  - [Supported commands](#supported-commands)
    - [addWorksheet](#addworksheet)
    - [getWorksheet](#getworksheet)
    - [removeWorksheet](#removeworksheet)
    - [updateData](#updatedata)
    - [appendData](#appenddata)
    - [getCellData](#getcelldata)
    - [getInfo](#getinfo)
  - [TODO](#todo)

## Usage

### Secrets required as environment variables

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
        uses: jroehl/gsheet.action@v1.0.0 # you can specify the "release" branch to have always the latest changes (dangerous)
        with:
          spreadsheetId: <spreadsheetId>
          commands: | # list of commands, specified as a valid JSON string
            [
              { "command": "addWorksheet", "args": { "worksheetTitle": "<worksheetTitle>" }},
              { "command": "updateData", "args": { "data": [["A1", "A2", "A3"]] }}
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

## Supported commands

### addWorksheet

Adds a worksheet with the specified title to the spreadsheet

- args
  - worksheetTitle:string

### getWorksheet

Gets an existing worksheet with the specified title

- args
  - worksheetTitle:string

### removeWorksheet

Removes an existing worksheet with the specified title

- args
  - worksheetTitle:string

### updateData

> needs to be called after one of addWorksheet | getWorksheet to select the worksheet for this operation

Updates cells with the specified data

- args
  - data:Array<Array\<primitive>> (specifies the data as nested array [["1", "2", "3"]])
  - row?:number (the optional starting row of the operation)
  - col?:number (the optional starting col of the operation)

### appendData

> needs to be called after one of addWorksheet | getWorksheet to select the worksheet for this operation

Append cells with the specified data after the last row in starting col

- args
  - data:Array<Array\<primitive>> (specifies the data as nested array [["1", "2", "3"]])
  - col?:number (the optional starting col of the operation)

### getCellData

> needs to be called after one of addWorksheet | getWorksheet to select the worksheet for this operation

Returns cell data as Array<Array\<primitive>>

- args
  - minRow?:number (the optional starting row of the operation)
  - minCol?:number (the optional starting col of the operation)
  - maxRow?:number (the optional ending row of the operation)
  - maxCol?:number (the optional ending col of the operation)

### getInfo

Returns spreadsheet info

## TODO

- [ ] documentation
- [ ] tests