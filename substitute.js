const vscode = require("vscode");
const { showInformationMessage, createStatusBarItem } = vscode.window;
const { registerCommand } = vscode.commands;

// json parsing (default parsing doesn't work with comments)
const { parse, stringify } = require("comment-json");

const fs = require("fs");
const path = require("path");
const registerSubstitute = require("./substitute");

module.exports = () => {
    registerCommand("extension.substitute", async () => {
        const editor = vscode.window.activeTextEditor;

        const range = editor.document.getWordRangeAtPosition(
            // get current position of the cursor
            editor.selection.active
        );

        const escapeRegExp = (string) => {
            return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
        };

        // print active
        showInformationMessage(editor.selection.active.line + " " + editor.selection.active.character);

        let selection = editor.document.getText(range); // get the word at the range

        let short = "";
        let replace = "";

        if (selection.startsWith("ID3D") || selection.startsWith("IDXGI") || selection.startsWith("ID3D11")) {
            // get the shortened name
            short = selection.replace("ID3D11", "").replace("IDXGI", "").replace("ID3D", "");
            selection += " *";

            replace = `using ${short} = ${selection};\n`;
        } else {
            // first case: to shorten names in general
            if (selection.indexOf("_") != -1) {
                // get the shortened name
                short = selection.substring(selection.indexOf("_") + 1);
                // check if short ends like DESC[0-9]?
                // using regex

                // provide a popup to select whether to use pascal case or not
                // two options: PascalCase, MACRO_CASE

                let option = await vscode.window.showQuickPick(["using statement", "#define statement"], {
                    placeHolder: "Select the case",
                });

                if (option == "using statement") {
                    // short = short.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
                    replace = `using ${short} = ${selection};\n`;
                } else {
                    replace = `#define ${short} ${selection}\n`;
                }
            } else {
                // just a function
                short = selection.replace("D3D11", "").replace("DXGI", "").replace("D3D", "");

                replace = `#define ${short} ${selection}\n`;
            }
        }

        // add the replace statement
        let edit = new vscode.WorkspaceEdit();

        let text = editor.document.getText();
        text = text.replace(new RegExp("\\b" + escapeRegExp(selection) + "\\b", "g"), short + " ");
        edit.replace(editor.document.uri, new vscode.Range(0, 0, editor.document.lineCount, 0), text);

        // isnert on the first line
        edit.insert(editor.document.uri, new vscode.Position(1, 0), replace);
        // also replace the type with the shortened name
        vscode.workspace.applyEdit(edit);

        // print the shortened name
        showInformationMessage(`shortened ${selection} to ${short}`);
    });
};
