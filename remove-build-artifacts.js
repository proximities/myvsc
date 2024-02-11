const vscode = require("vscode");
const { showInformationMessage, createStatusBarItem } = vscode.window;
const { registerCommand } = vscode.commands;

// json parsing (default parsing doesn't work with comments)
const { parse, stringify } = require("comment-json");

const fs = require("fs");
const path = require("path");
const registerSubstitute = require("./substitute");
const registerRemoveBuildArtifacts = require("./remove-build-artifacts");

module.exports = () => {
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
}
