const vscode = require("vscode");
const { showInformationMessage, createStatusBarItem } = vscode.window;
const { registerCommand } = vscode.commands;

// json parsing (default parsing doesn't work with comments)
const { parse, stringify } = require("comment-json");

const fs = require("fs");
const path = require("path");
const registerSubstitute = require("./substitute");
const registerRemoveBuildArtifacts = require("./remove-build-artifacts");

let O2StatusBarItem;
let ZiStatusBarItem;
let SubsystemWindowsStatusBarItem;
let ArgsStatusBarItem;

function updateO2StatusBarItem() {
    let o2Index = findTaskArgs().indexOf("/O2");
    O2StatusBarItem.text = "O2: " + (o2Index == -1 ? "Off" : "On");
    O2StatusBarItem.show();
}

function updateZiStatusBarItem() {
    let ziIndex = findTaskArgs().indexOf("/Zi");
    ZiStatusBarItem.text = "Zi: " + (ziIndex == -1 ? "Off" : "On");
    ZiStatusBarItem.show();
}

function updateSubsystemWindowsStatusBarItem() {
    let subsystemIndex = findTaskArgs().indexOf("/subsystem:windows");
    SubsystemWindowsStatusBarItem.text = "Subsystem: " + (subsystemIndex == -1 ? "Console" : "Windows");
    SubsystemWindowsStatusBarItem.show();
}

function updateArgsStatusBarItem() {
    ArgsStatusBarItem.text = "Cmdline Args: " + findLaunchArgs()?.join(" ");
    ArgsStatusBarItem.show();
}
function activate(context) {
    console.log(legend);
    vscode.languages.registerDocumentSemanticTokensProvider({ language: "pbl" }, new DocumentSemanticTokensProvider(), legend);

    O2StatusBarItem = createStatusBarItem(vscode.StatusBarAlignment.Right, 10000);
    O2StatusBarItem.command = "extension.toggleO2";
    updateO2StatusBarItem();

    ZiStatusBarItem = createStatusBarItem(vscode.StatusBarAlignment.Right, 10000);
    ZiStatusBarItem.command = "extension.toggleZi";
    updateZiStatusBarItem();

    SubsystemWindowsStatusBarItem = createStatusBarItem(vscode.StatusBarAlignment.Right, 10000);
    SubsystemWindowsStatusBarItem.command = "extension.toggleSubsystemWindows";
    updateSubsystemWindowsStatusBarItem();

    ArgsStatusBarItem = createStatusBarItem(vscode.StatusBarAlignment.Right, 10000);
    ArgsStatusBarItem.command = "extension.changeArgs";
    updateArgsStatusBarItem();

    console.log('Congratulations, your extension "helloworld-minimal-sample" is now active!');

    registerSubstitute();
    registerRemoveBuildArtifacts();

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
        } else {
            args.splice(index, 1);
        }
        fs.writeFileSync(tasksPath, stringify(tasks, null, 4));

        updateSubsystemWindowsStatusBarItem();
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
            args.unshift("/Zi");
        } else {
            args.splice(index, 1);
        }
        fs.writeFileSync(tasksPath, stringify(tasks, null, 4));

        updateZiStatusBarItem();
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
            args.unshift("/O2");
        } else {
            args.splice(index, 1);
        }
        fs.writeFileSync(tasksPath, stringify(tasks, null, 4));

        updateO2StatusBarItem();
    });

    registerCommand("extension.changeArgs", async () => {
        let workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        let launchPath = path.join(workspacePath, ".vscode", "launch.json");

        let launch = parse(fs.readFileSync(launchPath, "utf-8"));

        let args = launch.configurations[0].args;

        let newArgs = await vscode.window.showInputBox({
            placeHolder: "Enter the new args",
            value: args?.join(" "),
        });
        // check if the user pressed cancel
        if (!newArgs) return;

        launch.configurations[0].args = newArgs.split(" ");
        fs.writeFileSync(launchPath, stringify(launch, null, 4));

        updateArgsStatusBarItem();
    });
}

// function to find the args in tasks.json
const findTaskArgs = () => {
    let workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    let tasksPath = path.join(workspacePath, ".vscode", "tasks.json");
    let tasks = parse(fs.readFileSync(tasksPath, "utf-8"));
    return tasks.tasks[0].args;
};

// function to find the args in launch.json
const findLaunchArgs = () => {
    let workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    let launchPath = path.join(workspacePath, ".vscode", "launch.json");
    let launch = parse(fs.readFileSync(launchPath, "utf-8"));
    return launch.configurations[0].args;
};

const tokenTypes = new Map();
const tokenModifiers = new Map();

const legend = (function () {
    const tokenTypesLegend = [
        "comment",
        "string",
        "keyword",
        "number",
        "regexp",
        "operator",
        "namespace",
        "type",
        "struct",
        "class",
        "interface",
        "enum",
        "typeParameter",
        "function",
        "method",
        "decorator",
        "macro",
        "variable",
        "parameter",
        "property",
        "label",
    ];
    tokenTypesLegend.forEach((tokenType, index) => tokenTypes.set(tokenType, index));

    const tokenModifiersLegend = ["declaration", "documentation", "readonly", "static", "abstract", "deprecated", "modification", "async"];
    tokenModifiersLegend.forEach((tokenModifier, index) => tokenModifiers.set(tokenModifier, index));

    return new vscode.SemanticTokensLegend(tokenTypesLegend, tokenModifiersLegend);
})();
class DocumentSemanticTokensProvider {
    async provideDocumentSemanticTokens(document, token) {
        const allTokens = this._parseText(document.getText());
        const builder = new vscode.SemanticTokensBuilder();
        allTokens.forEach((token) => {
            builder.push(token.line, token.startCharacter, token.length, this._encodeTokenType(token.tokenType), this._encodeTokenModifiers(token.tokenModifiers));
        });
        return builder.build();
    }

    _encodeTokenType(tokenType) {
        if (tokenTypes.has(tokenType)) {
            return tokenTypes.get(tokenType);
        } else if (tokenType === "notInLegend") {
            return tokenTypes.size + 2;
        }
        return 0;
    }

    _encodeTokenModifiers(strTokenModifiers) {
        let result = 0;
        for (let i = 0; i < strTokenModifiers.length; i++) {
            const tokenModifier = strTokenModifiers[i];
            if (tokenModifiers.has(tokenModifier)) {
                result = result | (1 << tokenModifiers.get(tokenModifier));
            } else if (tokenModifier === "notInLegend") {
                result = result | (1 << (tokenModifiers.size + 2));
            }
        }
        return result;
    }

    _parseText(text) {
        const r = [];
        const lines = text.split(/\r\n|\r|\n/);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let currentOffset = 0;
            do {
                const openOffset = line.indexOf("[", currentOffset);
                if (openOffset === -1) {
                    break;
                }
                const closeOffset = line.indexOf("]", openOffset);
                if (closeOffset === -1) {
                    break;
                }
                const tokenData = this._parseTextToken(line.substring(openOffset + 1, closeOffset));
                r.push({
                    line: i,
                    startCharacter: openOffset + 1,
                    length: closeOffset - openOffset - 1,
                    tokenType: tokenData.tokenType,
                    tokenModifiers: tokenData.tokenModifiers,
                });
                currentOffset = closeOffset;
            } while (true);
        }
        return r;
    }

    _parseTextToken(text) {
        const parts = text.split(".");
        return {
            tokenType: parts[0],
            tokenModifiers: parts.slice(1),
        };
    }
}

function deactivate() {}

module.exports = {
    activate,
    deactivate,
};
