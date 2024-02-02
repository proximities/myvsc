// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "helloworld-minimal-sample" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('extension.addUsingStatement', () => {
		// The code you place here will be executed every time your command is executed
		const textEditor = vscode.window.activeTextEditor;
		if (!textEditor) {
			vscode.window.showInformationMessage('No active text editor');
		}
		else {
			let selection = textEditor.selection;
			// get selected text
			let word = textEditor.document.getText(selection);

			// if it starts with "D3D_", "DXGI_", or "D3D11_", then add a "using" statement at the top of the file
			if (word.startsWith('D3D11_') || word.startsWith('DXGI_') || word.startsWith('D3D_')) {
				let edit = new vscode.WorkspaceEdit();
				// trim the left side up to the first _ i.e. D3D_... becomes ...
				let short = word.substring(word.indexOf('_') + 1);
				// insert the using statement at the top of the file
				let usingStatement = `using ${short} = ${word};\n`;
				// check if the file already has a using statement
				// if not, then add it
				if (textEditor.document.getText().indexOf(usingStatement) == -1) {
					edit.insert(textEditor.document.uri, new vscode.Position(0, 0), usingStatement);
					vscode.workspace.applyEdit(edit);
				}
			}
			else if (word.startsWith('ID3D') || word.startsWith('IDXGI') || word.startsWith('ID3D11')) {
				// same thing as before, but add using for the pointer type 
				let edit = new vscode.WorkspaceEdit();
				// remove id3d or idxgi or id3d11
				// string replace
				let short = word.replace('ID3D11', '').replace('IDXGI', '').replace('ID3D', '');
				let usingStatement = `using ${short} = ${word} *;\n`;
				if (textEditor.document.getText().indexOf(usingStatement) == -1) {
					edit.insert(textEditor.document.uri, new vscode.Position(0, 0), usingStatement);
					vscode.workspace.applyEdit(edit);
				}
			}
		}
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
function deactivate() { }

// eslint-disable-next-line no-undef
module.exports = {
	activate,
	deactivate
}
