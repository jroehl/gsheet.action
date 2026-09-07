# gsheet.action

gsheet.action is a GitHub action designed to facilitate Create, Read, Update, and Delete (CRUD) operations on Google Sheets directly from your GitHub workflows.

- [gsheet.action](#gsheetaction)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Setup of Credentials](#setup-of-credentials)
      - [Step 1: Setting Up Google Service Account](#step-1-setting-up-google-service-account)
      - [Step 2: Sharing the Spreadsheet](#step-2-sharing-the-spreadsheet)
      - [Step 3: Setting Up the GitHub Action](#step-3-setting-up-the-github-action)
    - [Setup in GitHub Action Workflow](#setup-in-github-action-workflow)
  - [Migrating from v2](#migrating-from-v2)
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

Before you start using the gsheet.action, some preliminary setup is required.

### Prerequisites

The action requires the following environment variables:

- `GSHEET_CLIENT_EMAIL`: The email of the service account that has permission to access the Google Spreadsheet.
- `GSHEET_PRIVATE_KEY`: The private key of the service account that has permission to access the Google Spreadsheet.

These secrets should be stored as environment variables in your GitHub repository.

### Setup of Credentials

#### Step 1: Setting Up Google Service Account

1. Login to [Google API Console](https://console.cloud.google.com/) using your Google account.
2. Navigate to the "Library" section and enable the Google Sheets API.
3. Go to the "Credentials" section, click on the "Create Credentials" dropdown button and select "Service Account".
4. Once the service account is created, a JSON file with the service account's credentials will be automatically generated. Download this file; you will need the `client_email` and `private_key`.

#### Step 2: Sharing the Spreadsheet

1. Open the Google Spreadsheet you want to use with this action and click on the "Share" button.
2. Add the `client_email` to the sharing settings with read permissions.
3. The document ID can be found in the URL of your Google Spreadsheet, between '/d/' and '/edit'.

#### Step 3: Setting Up the GitHub Action

1. Navigate to the "Secrets" section of your repository settings and create new secrets for `client_email` and `private_key`.
2. Use the action in your workflow as demonstrated in the usage example, substituting the placeholder values with the names of the secrets you just created.

### Setup in GitHub Action Workflow

The YAML configuration for using gsheet.action in your GitHub action workflow would look something like this:

```yaml
name: gsheet.action test
on: push

jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - id: 'update_worksheet'
        uses: jroehl/gsheet.action@v3
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

If you are getting a lot of data from a spreadsheet, the output may be too large. In this case you can write the results to a file:

```yaml
name: gsheet.action test
on: push

jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - id: 'update_worksheet'
        uses: jroehl/gsheet.action@v3
        with:
          spreadsheetId: <spreadsheetId>
          commands: | # list of commands, specified as a valid JSON string
            [
              { "command": "getData", "args": { "range": "'<worksheetTitle>'!A:Z" } }
            ]
          outputFile: /tmp/gsheet_action_results.json
        env:
          GSHEET_CLIENT_EMAIL: ${{ secrets.GSHEET_CLIENT_EMAIL }}
          GSHEET_PRIVATE_KEY: ${{ secrets.GSHEET_PRIVATE_KEY }}
      - name: echo results
        run: cat /tmp/gsheet_action_results.json | jq
```

The file always receives the full JSON. Once the results pass 1,000,000 bytes the `results` output becomes `{"outputFile": "<path>", "truncated": true}` and a notice is logged, so a large read never fails the step - the file holds everything. Without `outputFile` the output keeps carrying the full JSON and a warning suggests setting the input, since there would be nowhere else to read the results from.

> See ./.github/workflows/ci.yml for another example.

## Migrating from v2

The only change you have to make is the version reference:

```diff
-      uses: jroehl/gsheet.action@v2.1.1
+      uses: jroehl/gsheet.action@v3
```

(Shown from `@v2.1.1`, the last v2 release; the same one-line change applies whichever v2.x you're currently pinned to, including the older `@v2.0.0` used in earlier versions of this README.)

`@release` still works but is deprecated in favor of `@v3`; move off it when convenient.

Command syntax, inputs and outputs are otherwise compatible. These are the differences you may notice:

- **The runtime.** The action runs on `node24` instead of the removed `node16`. That is the reason for the release.
- **`hasHeaderRow: "false"` now means false.** v2 read the string `"false"` as truthy and stripped the first row; v3 reads it as the boolean it looks like. **This is the only change that alters results without saying so**: on a `getData` whose `hasHeaderRow` is the string `"false"`, `header` is now `["(A)", "(B)", ...]` rather than your first row, and `formatted` and `rawData` include that row. Pass `true` or `"true"` if you were relying on the old reading. Anything that is not the string `"true"` or `"false"` - `1`, `0`, `"yes"` - is still read by plain truthiness, as it was on v2.
- **`data: [[1]]` works.** Single-value nested arrays, and nested arrays holding numbers or booleans, used to be rejected as "not nested" (#616). They now write.
- **New optional `outputFile` input.** Writes the full results JSON to a path of your choosing. Existing workflows are unaffected; see the example above.
- **A different error message for malformed `data`.** The text changed; the input shapes that fail did not. `data: []` is still accepted and still issues an empty write.
- **A `punycode` deprecation warning on stderr.** `[DEP0040] DeprecationWarning: The punycode module is deprecated` comes from a transitive dependency on Node 21 and above. It is noise, not a failure, and disappears when that dependency is updated.

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
  
### renameWorksheet

Rename an existing worksheet to the specified title

- args
  - worksheetTitle:string - The title of the worksheet (needed if no previous command set the worksheetTitle globally)
  - newWorksheetTitle:string - The new title of the worksheet
  - [spreadsheetId]?:string - The id of the spreadsheet (needed if no previous command set the spreadsheetId globally)
  
### updateData

Updates cells with the specified data (at the specified range)

- args
  - data:json - The data to be used as a JSON string - nested array [["1", "2", "3"]]
  - [spreadsheetId]?:string - The id of the spreadsheet (needed if no previous command set the spreadsheetId globally)
  - [minRow=1]?:number - Starting row of the operation
  - [minCol=1]?:number - Starting column of the operation
  - [range]?:string - Range in a1 notation to be used for the operation
  - [valueInputOption=RAW]?:string - The input value to be used
  - [worksheetTitle]?:string - The title of the worksheet (needed if no previous command set the worksheetTitle globally)
  
### appendData

Append cells with the specified data after the last row (in starting col)

- args
  - data:json - The data to be used as a JSON string - nested array [["1", "2", "3"]]
  - [spreadsheetId]?:string - The id of the spreadsheet (needed if no previous command set the spreadsheetId globally)
  - [minCol=1]?:number - Starting column of the operation
  - [range]?:string - Range in a1 notation to be used for the operation
  - [valueInputOption=RAW]?:string - The input value to be used
  - [worksheetTitle]?:string - The title of the worksheet (needed if no previous command set the worksheetTitle globally)
  
### getData

Get cell data (within specified range)

- args
  - [spreadsheetId]?:string - The id of the spreadsheet (needed if no previous command set the spreadsheetId globally)
  - [minRow=1]?:number - Starting row of the operation
  - [minCol=1]?:number - Starting column of the operation
  - [maxRow]?:number - Last row of the operation
  - [maxCol]?:number - Last column of the operation
  - [range]?:string - Range in a1 notation to be used for the operation
  - [hasHeaderRow]?:boolean - If the first row should be treated as header row
  - [worksheetTitle]?:string - The title of the worksheet (needed if no previous command set the worksheetTitle globally)
  
<!-- commandsstop -->

## Build with

- [google-sheet-cli](https://github.com/jroehl/google-sheet-cli/) - The node module used for manipulating the google sheet
- [semantic-release](https://github.com/semantic-release/semantic-release) - for releasing new versions
- [typescript](https://www.typescriptlang.org)

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on contributing to this project.

## Versioning

We use [SemVer](http://semver.org/) for versioning. You can view available versions under [tags on this repository](https://github.com/jroehl/gsheet.action/tags).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
