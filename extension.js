const vscode = require("vscode");
const { showInformationMessage, createStatusBarItem } = vscode.window;
const { registerCommand } = vscode.commands;

// json parsing (default parsing doesn't work with comments)
const { parse, stringify } = require("comment-json");

const fs = require("fs");
const path = require("path");
const registerSubstitute = require("./substitute");
const registerRemoveBuildArtifacts = require("./remove-build-artifacts");

// lsp
const { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } = require("vscode-languageclient/node");


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

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    // check if there exists a tasks.json with first task type == cppbuild
    let workspacePath = vscode.workspace.workspaceFolders;
    if (!workspacePath) return;
    workspacePath = workspacePath[0].uri.fsPath;
    let tasksPath = path.join(workspacePath, ".vscode", "tasks.json");
    let exists = fs.existsSync(tasksPath) && parse(fs.readFileSync(tasksPath, "utf-8"))?.tasks[0]?.type == "cppbuild";
    if (!exists) return;
    // check if there exists a launch.json with first configuration type == cppvsdbg
    let launchPath = path.join(workspacePath, ".vscode", "launch.json");
    exists = fs.existsSync(launchPath) && parse(fs.readFileSync(launchPath, "utf-8"))?.configurations[0]?.type == "cppvsdbg";
    if (!exists) return;

    // // The server is implemented in node
    // const serverModule = context.asAbsolutePath(path.join("server", "out", "server.js"));
    // // If the extension is launched in debug mode then the debug server options are used
    // // Otherwise the run options are used
    // const serverOptions = {
    //     run: { module: serverModule, transport: node_1.TransportKind.ipc },
    //     debug: {
    //         module: serverModule,
    //         transport: node_1.TransportKind.ipc,
    //     },
    // };
    // // Options to control the language client
    // const clientOptions = {
    //     // Register the server for plain text documents
    //     documentSelector: [{ scheme: "file", language: "plaintext" }],
    //     synchronize: {
    //         // Notify the server about file changes to '.clientrc files contained in the workspace
    //         fileEvents: vscode_1.workspace.createFileSystemWatcher("**/.clientrc"),
    //     },
    // };
    // // Create the language client and start the client.
    // client = new node_1.LanguageClient("languageServerExample", "Language Server Example", serverOptions, clientOptions);
    // // Start the client. This will also launch the server
 	// The server is implemented in node

	// const serverModule = context.asAbsolutePath(
	// 	path.join('server.js')
	// );

	// // If the extension is launched in debug mode then the debug server options are used
	// // Otherwise the run options are used
	// const serverOptions = {
	// 	run: { module: serverModule, transport: TransportKind.ipc },
	// 	debug: {
	// 		module: serverModule,
	// 		transport: TransportKind.ipc,
	// 	}
	// };

	// // Options to control the language client
	// const clientOptions = {
	// 	// Register the server for plain text documents
	// 	documentSelector: [{ scheme: 'file', language: 'pbl' }],
	// 	synchronize: {
	// 		// Notify the server about file changes to '.clientrc files contained in the workspace
	// 		fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
	// 	}
	// };

	// // Create the language client and start the client.
	// client = new LanguageClient(
	// 	'languageServerExample',
	// 	'Language Server Example',
	// 	serverOptions,
	// 	clientOptions
	// );

	// Start the client. This will also launch the server
	// client.start();   // client.start();

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

function deactivate() {}

module.exports = {
    activate,
    deactivate,
};
