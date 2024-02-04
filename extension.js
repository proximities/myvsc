

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const vscodeExtSelection = require('vscode-ext-selection');
// const { selectWordAtCursorPosition } = require('selectWordAtCursorPosition');

// import { selectWordAtCursorPosition } from "vscode-ext-selection";




/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	console.log('Congratulations, your extension "helloworld-minimal-sample" is now active!');

	vscode.commands.registerCommand('extension.addDefineStatement', () => {

		const textEditor = vscode.window.activeTextEditor;
		if (!textEditor) {
			vscode.window.showInformationMessage('No active text editor');
		}
		else {
			let selection = textEditor.selection;

			let word = "";
			if (vscodeExtSelection.selectWordAtCursorPosition(textEditor)) {
				word = textEditor.document.getText(textEditor.selection);
			}
			else {
				vscode.window.showErrorMessage('could not select word');
				return;
			}

			if (word.startsWith('D3D11_') || word.startsWith('DXGI_') || word.startsWith('D3D_')) {
				let edit = new vscode.WorkspaceEdit();

				let short = word.substring(word.indexOf('_') + 1);
				// also trim underscores
				// make short PascalCase
				// split short by underscore
				// capitalize each word
				// join the words
				short = short.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
				// short = short.replace(/_/g, '');

				let defineStatement = `#define ${short} ${word}\n`;


				if (textEditor.document.getText().indexOf(defineStatement) == -1) {
					edit.insert(textEditor.document.uri, new vscode.Position(0, 0), defineStatement);
					vscode.workspace.applyEdit(edit);
				}
			}
			else if (word.startsWith('ID3D') || word.startsWith('IDXGI') || word.startsWith('ID3D11')) {

				let edit = new vscode.WorkspaceEdit();


				let short = word.replace('ID3D11', '').replace('IDXGI', '').replace('ID3D', '');
				let defineStatement = `#define ${short} ${word} *\n`;
				if (textEditor.document.getText().indexOf(defineStatement) == -1) {
					edit.insert(textEditor.document.uri, new vscode.Position(0, 0), defineStatement);
					vscode.workspace.applyEdit(edit);
				}
			}
			// focus on the first line
			textEditor.selection = new vscode.Selection(0, 0, 0, 0);
			// also scroll to the first line
			textEditor.revealRange(new vscode.Range(0, 0, 0, 0));
		}
	});


	vscode.commands.registerCommand('extension.removeBuildFolder', () => {


		let workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
		let buildPaths = [path.join(workspacePath, 'build'), path.join(workspacePath, 'out')];
		for (p of buildPaths) {
			if (fs.existsSync(p)) {
				fs.rmdirSync(p, { recursive: true });
			}
		}
	});


	vscode.commands.registerCommand('extension.makeGameCodeReadable', () => {
		const textEditor = vscode.window.activeTextEditor;
		if (!textEditor) {
			vscode.window.showInformationMessage('No active text editor');
		}
		else {
			textEditor.edit(edit => {
				let range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(textEditor.document.lineCount, 0));
				let text = textEditor.document.getText(range);


				let patterns = [/D3D11_/g, /DXGI_/g, /D3D_/g, /ID3D11/g, /IDXGI/g, /ID3D/g, /D3D11/g, /DXGI/g, /D3D/g];


				patterns.forEach(pattern => {
					text = text.replace(pattern, '');
				});

				text = text.replace(/typedef struct/g, 'struct');
				text = text.replace(/typedef enum/g, 'enum');
				text = text.replace(/typedef union/g, 'union');

				edit.replace(range, text);
			});
		}
	});
}


function deactivate() { }


module.exports = {
	activate,
	deactivate
}
