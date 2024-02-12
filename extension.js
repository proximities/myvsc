const vscode = require("vscode");
const { showInformationMessage, createStatusBarItem } = vscode.window;
const { registerCommand } = vscode.commands;

// json parsing (default parsing doesn't work with comments)
const { parse, stringify } = require("comment-json");

const fs = require("fs");
const path = require("path");
const registerSubstitute = require("./substitute");
const registerRemoveBuildArtifacts = require("./remove-build-artifacts");
const tokens = require(String.raw`C:\Users\pblpbl\code\game\tokenizer.js`);

let O2;
let Zi;
let SubsystemWindows;
let Args;

function updateO2() {
    let o2Index = findTaskArgs().indexOf("/O2");
    O2.text = "O2: " + (o2Index == -1 ? "Off" : "On");
    O2.show();
}

function updateZi() {
    let ziIndex = findTaskArgs().indexOf("/Zi");
    Zi.text = "Zi: " + (ziIndex == -1 ? "Off" : "On");
    Zi.show();
}

function updateSubsystemWindows() {
    let subsystemIndex = findTaskArgs().indexOf("/subsystem:windows");
    SubsystemWindows.text = "Subsystem: " + (subsystemIndex == -1 ? "Console" : "Windows");
    SubsystemWindows.show();
}

function updateArgs() {
    Args.text = "Cmdline Args: " + findLaunchArgs()?.join(" ");
    Args.show();
}
function activate(context) {

    console.log(tokens);
    vscode.languages.registerDocumentSemanticTokensProvider({ language: "pbl" }, new DocumentSemanticTokensProvider(), legend);

    O2 = createStatusBarItem(vscode.StatusBarAlignment.Right, 10000);
    O2.command = "extension.toggleO2";
    updateO2();

    Zi = createStatusBarItem(vscode.StatusBarAlignment.Right, 10000);
    Zi.command = "extension.toggleZi";
    updateZi();

    SubsystemWindows = createStatusBarItem(vscode.StatusBarAlignment.Right, 10000);
    SubsystemWindows.command = "extension.toggleSubsystemWindows";
    updateSubsystemWindows();

    Args = createStatusBarItem(vscode.StatusBarAlignment.Right, 10000);
    Args.command = "extension.changeArgs";
    updateArgs();

    console.log('Congratulations, your extension "helloworld-minimal-sample" is now active!');

    registerSubstitute();
    registerRemoveBuildArtifacts();

    // __uuidof -> IID_PPV_ARGS

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

        updateSubsystemWindows();
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

        updateZi();
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

        updateO2();
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

        updateArgs();
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
tokens.forEach((tokenType, index) => tokenTypes.set(tokenType, index));

const legend = new vscode.SemanticTokensLegend(tokens);
class DocumentSemanticTokensProvider {
    async provideDocumentSemanticTokens(document, token) {
        const allTokens = this._parseText(document.getText());
        const builder = new vscode.SemanticTokensBuilder();
        allTokens.forEach((token) => {
            builder.push(token.line, token.startCharacter, token.length, this._encodeTokenType(token.tokenType), 0);
        });
        return builder.build();
    }

    _encodeTokenType(tokenType) {
        if (tokenTypes.has(tokenType)) return tokenTypes.get(tokenType);
        else return tokenTypes.size + 2;
    }

    // takes the text and returns a list of {line, startCharacter, length, tokenType, tokenModifiers}
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
