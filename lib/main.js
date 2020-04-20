"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const lib_1 = require("./lib");
const google_sheet_cli_1 = require("google-sheet-cli");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const spreadsheetId = core.getInput('spreadsheetId', { required: true });
            const { GSHEET_CLIENT_EMAIL, GSHEET_PRIVATE_KEY } = process.env;
            if (!GSHEET_CLIENT_EMAIL || !GSHEET_PRIVATE_KEY)
                throw 'Google sheets credentials have to be supplied';
            const gsheet = new google_sheet_cli_1.GoogleSheet(spreadsheetId);
            yield gsheet.authorize({
                client_email: GSHEET_CLIENT_EMAIL,
                private_key: GSHEET_PRIVATE_KEY,
            });
            const commandsString = core.getInput('commands', { required: true });
            const validatedCommands = lib_1.validateCommands(commandsString);
            const results = [];
            yield lib_1.asyncForEach(validatedCommands, (command) => __awaiter(this, void 0, void 0, function* () {
                const { func, kwargs } = command;
                const result = yield gsheet[func](...kwargs);
                results.push({ command, result });
            }));
            core.setOutput('results', JSON.stringify({ results }));
            core.debug(`Processed commands\n${JSON.stringify(results, null, 2)}`);
            return { results };
        }
        catch (error) {
            core.setFailed(error.message || error);
            return { error, results: [] };
        }
    });
}
exports.default = run;
!process.env.TEST && run();
