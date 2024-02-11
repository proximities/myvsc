let vscode = require("vscode");
let { showInformationMessage } = vscode.window;
let { registerCommand, executeCommand } = vscode.commands;
let { selectWordAtCursorPosition } = require("vscode-ext-selection");
let tm = require("vscode-textmate-languageservice");
// json parsing

let { parse, stringify, assign } = require("comment-json");

let assert = require("assert");
let fs = require("fs");
let path = require("path");

// let registerCommand = vscode.commands.registerCommand;

// t { selectWordAtCursorPosition } = require('selectWordAtCursorPosition');

// import { selectWordAtCursorPosition } from "vscode-ext-selection";

const getWord = () => {
    const editor = vscode.window.activeTextEditor;

    selectWordAtCursorPosition(editor);
    const word = editor.document.getText(editor.selection);
    return word;
};

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

let O2StatusBarItem;
let ZiStatusBarItem;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    O2StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10000);
    let o2Index = findO2();
    O2StatusBarItem.text = "O2: " + (o2Index == -1 ? "Off" : "On");
    O2StatusBarItem.command = "extension.toggleO2";
    O2StatusBarItem.show();

    ZiStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10000);
    let ziIndex = findZi();
    ZiStatusBarItem.text = "Zi: " + (ziIndex == -1 ? "Off" : "On");
    ZiStatusBarItem.command = "extension.toggleZi";
    ZiStatusBarItem.show();

    console.log('Congratulations, your extension "helloworld-minimal-sample" is now active!');

    registerCommand("extension.substitute", async () => {
        const editor = vscode.window.activeTextEditor;
        assert(editor, "ERROR: No active text editor");

        const range = editor.document.getWordRangeAtPosition(
            // get current position of the cursor
            editor.selection.active
        );

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

    registerCommand("extension.removeBuildArtifacts", async () => {
        // first stop all terminals and wait
        await vscode.commands.executeCommand("workbench.action.terminal.kill");

        let workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        let buildPaths = [path.join(workspacePath, "build"), path.join(workspacePath, "out")];
        for (p of buildPaths) {
            if (fs.existsSync(p)) {
                fs.rmdirSync(p, {
                    recursive: true,
                });
            }
        }

        // also remove all *.exe, *.dll, *.lib, *.pdb, *.ilk, *.exp, *.obj, *.idb, *.ipdb, *.iobj, *.log
        // readdirSync isn't recursive
        let files = fs.readdirSync(workspacePath);
        let artifacts = files.filter(
            (f) =>
                f.endsWith(".exe") ||
                f.endsWith(".dll") ||
                f.endsWith(".lib") ||
                f.endsWith(".pdb") ||
                f.endsWith(".ilk") ||
                f.endsWith(".exp") ||
                f.endsWith(".obj") ||
                f.endsWith(".idb") ||
                f.endsWith(".ipdb") ||
                f.endsWith(".iobj") ||
                f.endsWith(".log")
        );
        for (a of artifacts) {
            fs.unlinkSync(path.join(workspacePath, a));
        }
    });

    // __uuidof -> IID_PPV_ARGS
    registerCommand("extension.replaceUuids", () => {
        // regex __uuidof\(.*\), reinterpret_cast<void \*\*>\((.*)\)
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            showInformationMessage("No active text editor");
        } else {
            editor.edit((edit) => {
                let range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(editor.document.lineCount, 0));
                let text = editor.document.getText(range);

                let pattern = /__uuidof\(.*\), reinterpret_cast<void \*\*>\((.*)\)/g;
                text = text.replace(pattern, "IID_PPV_ARGS($1)");
                edit.replace(range, text);
            });
        }
    });

    registerCommand("extension.cleanupCppHeader", () => {
        let editor = vscode.window.activeTextEditor;
        // replace BOOL with int (with word boundary)
        let edit = new vscode.WorkspaceEdit();
        // get selected text, if null then select all
        let text = editor.document.getText(editor.selection);
        if (!text) {
            text = editor.document.getText();
        }
        showInformationMessage(text);
        // https://www.freecodecamp.org/news/regular-expressions-for-beginners/
        text = text.replace(/\bBOOL\b/g, "int");
        text = text.replace(/\bLONG\b/g, "int");
        text = text.replace(/\bDWORD\b/g, "int");
        text = text.replace(/\bUINT\b/g, "int");
        text = text.replace(/\bULONG\b/g, "int");
        // replace long with int
        text = text.replace(/\blong\b/g, "int");
        // don't forget to #define long long long
        text = text.replace(/\bLRESULT\b/g, "long");
        text = text.replace(/\bWPARAM\b/g, "long");
        text = text.replace(/\bLPARAM\b/g, "long");
        text = text.replace(/\bLPVOID\b/g, "void *");
        text = text.replace(/\bLPCVOID\b/g, "const void *");
        text = text.replace(/\bLPCSTR\b/g, "const char *");
        text = text.replace(/\bLPCWSTR\b/g, "const wchar_t *");
        text = text.replace(/\bLPSTR\b/g, "char *");
        text = text.replace(/\bLPWSTR\b/g, "wchar_t *");
        text = text.replace(/\bLPCTSTR\b/g, "const char *");
        text = text.replace(/\bLPTSTR\b/g, "char *");
        text = text.replace(/\bHANDLE\b/g, "void *");
        text = text.replace(/\bHINSTANCE\b/g, "void *");
        text = text.replace(/\bHRESULT\b/g, "long");
        text = text.replace(/\bHWND\b/g, "void *");
        text = text.replace(/\bATOM\b/g, "short");
        text = text.replace(/\bHMODULE\b/g, "void *");
        text = text.replace(/\bHKEY\b/g, "void *");
        text = text.replace(/\bHDC\b/g, "void *");
        text = text.replace(/\bHBRUSH\b/g, "void *");
        text = text.replace(/\bHFONT\b/g, "void *");
        text = text.replace(/\bHICON\b/g, "void *");
        text = text.replace(/\bHCURSOR\b/g, "void *");
        text = text.replace(/\bHMENU\b/g, "void *");
        text = text.replace(/\bWINAPI\b/g, "");
        text = text.replace(/\bCALLBACK\b/g, "");
        text = text.replace(/\bAPIENTRY\b/g, "");
        text = text.replace(/\bSHORT\b/g, "short");
        text = text.replace(/\bWORD\b/g, "short");
        text = text.replace(/\bBYTE\b/g, "char");
        text = text.replace(/\bLPMSG\b/g, "MSG *");
        // find hex numbers and replace them with lowercase. also remove the L at the end if it exists
        text = text.replace(/\b0x[0-9A-F]+L\b/g, (match) => match.toLowerCase().replace("l", ""));
        // replace typedef enum, typedef struct, typedef union
        text = text.replace(/\btypedef enum\b/g, "enum");
        text = text.replace(/\btypedef struct\b/g, "struct");
        text = text.replace(/\btypedef union\b/g, "union");

        // replace DECLSPEC_XFGVIRT(.*)
        text = text.replace(/DECLSPEC_XFGVIRT\((.*)\)/g, "");

        console.log(text);
        edit.replace(editor.document.uri, new vscode.Range(0, 0, editor.document.lineCount, 0), text);
        vscode.workspace.applyEdit(edit);
    });

    registerCommand("extension.toggleSubsystemWindows", () => {
        // find .vscode/tasks.json
        // replace the subsystem with windows
        // if not found, create a new one
        let workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;

        let tasksPath = path.join(workspacePath, ".vscode", "tasks.json");

        // read the tasks.json
        let tasks = parse(fs.readFileSync(tasksPath, "utf-8"));

        // get the array tasks[0].args
        let args = tasks.tasks[0].args;
        // find the /subsystem:windows
        let index = args.indexOf("/subsystem:windows");
        if (index == -1) {
            args.push("/subsystem:windows");
            showInformationMessage("Added /subsystem:windows");
        } else {
            args.splice(index, 1);
            showInformationMessage("Removed /subsystem:windows");
        }
        fs.writeFileSync(tasksPath, stringify(tasks, null, 4));
    });

    // toggle Zi
    registerCommand("extension.toggleZi", () => {
        let workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        let tasksPath = path.join(workspacePath, ".vscode", "tasks.json");

        // read the tasks.json
        let tasks = parse(fs.readFileSync(tasksPath, "utf-8"));

        // get the array tasks[0].args
        let args = tasks.tasks[0].args;
        // find the /Zi
        let index = args.indexOf("/Zi");
        if (index == -1) {
            // insert @ beginning
            args.unshift("/Zi");
            ZiStatusBarItem.text = "Zi: ON";
            ZiStatusBarItem.show();

            // showInformationMessage('Added /Zi');
        } else {
            args.splice(index, 1);
            ZiStatusBarItem.text = "Zi: OFF";
            ZiStatusBarItem.show();
            // showInformationMessage('Removed /Zi');
        }
        fs.writeFileSync(tasksPath, stringify(tasks, null, 4));
    });

    // toggle O2
    registerCommand("extension.toggleO2", () => {
        let workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        let tasksPath = path.join(workspacePath, ".vscode", "tasks.json");

        // read the tasks.json
        let tasks = parse(fs.readFileSync(tasksPath, "utf-8"));

        // get the array tasks[0].args
        // note: in javascript: everything is passed by reference. things will 'bind' to objects by reference.
        // everything will work by reference except for re-assigning.
        // equivalent behaviour in c++: passing pointers, then using p->member
        let args = tasks.tasks[0].args;
        // find the /O2
        let index = args.indexOf("/O2");
        if (index == -1) {
            // insert @ beginning
            args.unshift("/O2");
            O2StatusBarItem.text = "O2: ON";
            O2StatusBarItem.show();
            // showInformationMessage("Added /O2");
        } else {
            args.splice(index, 1);
            O2StatusBarItem.text = "O2: OFF";
            O2StatusBarItem.show();
            // showInformationMessage("Removed /O2");
        }
        fs.writeFileSync(tasksPath, stringify(tasks, null, 4));
    });
}

// function to find Zi in tasks.json
const findZi = () => {
    let workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    let tasksPath = path.join(workspacePath, ".vscode", "tasks.json");

    // read the tasks.json
    let tasks = parse(fs.readFileSync(tasksPath, "utf-8"));

    // get the array tasks[0].args
    let args = tasks.tasks[0].args;
    // find the /Zi
    return args.indexOf("/Zi");
};

// function to find O2 in tasks.json
const findO2 = () => {
    let workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    let tasksPath = path.join(workspacePath, ".vscode", "tasks.json");

    // read the tasks.json
    let tasks = parse(fs.readFileSync(tasksPath, "utf-8"));

    // get the array tasks[0].args
    let args = tasks.tasks[0].args;
    // find the /O2
    return args.indexOf("/O2");
};

function deactivate() {}

module.exports = {
    activate,
    deactivate,
};
