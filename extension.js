
let vscode = require('vscode');
let { showInformationMessage } = vscode.window;
let { registerCommand } = vscode.commands;
let { selectWordAtCursorPosition } = require('vscode-ext-selection');
let tm = require('vscode-textmate-languageservice');
// json parsing

let { parse, stringify, assign } = require('comment-json')

let assert = require('assert');
let fs = require('fs');
let path = require('path');

// let registerCommand = vscode.commands.registerCommand;


// t { selectWordAtCursorPosition } = require('selectWordAtCursorPosition');

// import { selectWordAtCursorPosition } from "vscode-ext-selection";



const getWord = () => {
	const editor = vscode.window.activeTextEditor;

	selectWordAtCursorPosition(editor);
	const word = editor.document.getText(editor.selection);
	return word;
}



function escapeRegExp(string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}


/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	console.log('Congratulations, your extension "helloworld-minimal-sample" is now active!');



	registerCommand('extension.substitute', async () => {
		const editor = vscode.window.activeTextEditor;
		assert(editor, 'ERROR: No active text editor');

		const range = editor.document.getWordRangeAtPosition(
			// get current position of the cursor
			editor.selection.active
		);

		// print active
		showInformationMessage(editor.selection.active.line + ' ' + editor.selection.active.character);

		const selection = editor.document.getText(range); // get the word at the range

		let short = "";
		let replace = "";

		if (selection.startsWith('ID3D') || selection.startsWith('IDXGI') || selection.startsWith('ID3D11')) {
			// get the shortened name
			short = selection.replace('ID3D11', '').replace('IDXGI', '').replace('ID3D', '');
			selection += ' *';

			replace = `using ${short} = ${selection};\n`;
		}
		else {
			// first case: to shorten names in general
			if (selection.indexOf('_') != -1) {
				// get the shortened name
				short = selection.substring(selection.indexOf('_') + 1);
				// check if short ends like DESC[0-9]?
				// using regex

				// provide a popup to select whether to use pascal case or not
				// two options: PascalCase, MACRO_CASE

				let option = await vscode.window.showQuickPick(['PascalCase (using statement)', 'MACRO_CASE (#define statement)'], { placeHolder: 'Select the case' });

				if (option == 'PascalCase (using statement)') {
					short = short.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');

					replace = `using ${short} = ${selection};\n`;
				}
				else {
					replace = `#define ${short} ${selection}\n`;
				}
			}
			else {
				// just a function
				short = selection.replace('D3D11', '').replace('DXGI', '').replace('D3D', '');

				replace = `#define ${short} ${selection}\n`;
			}

		}

		// add the replace statement
		let edit = new vscode.WorkspaceEdit();


		let text = editor.document.getText();
		text = text.replace(new RegExp('\\b' + escapeRegExp(selection) + '\\b', 'g'), short + ' ');
		edit.replace(editor.document.uri, new vscode.Range(0, 0, editor.document.lineCount, 0), text);


		// isnert on the first line
		edit.insert(editor.document.uri, new vscode.Position(1, 0), replace);
		// also replace the type with the shortened name
		vscode.workspace.applyEdit(edit);

		// print the shortened name
		showInformationMessage(`shortened ${selection} to ${short}`);
	});

	registerCommand('extension.removeBuildArtifacts', () => {

		let workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
		let buildPaths = [path.join(workspacePath, 'build'), path.join(workspacePath, 'out')];
		for (p of buildPaths) {
			if (fs.existsSync(p)) {
				fs.rmdirSync(p, { recursive: true });
			}
		}

		// also remove all *.exe, *.dll, *.lib, *.pdb, *.ilk, *.exp, *.obj, *.idb, *.ipdb, *.iobj
		// readdirSync isn't recursive
		let files = fs.readdirSync(workspacePath);
		let artifacts = files.filter(f => f.endsWith('.exe') || f.endsWith('.dll') || f.endsWith('.lib') || f.endsWith('.pdb') || f.endsWith('.ilk') || f.endsWith('.exp') || f.endsWith('.obj') || f.endsWith('.idb') || f.endsWith('.ipdb') || f.endsWith('.iobj'));
		for (a of artifacts) {
			fs.unlinkSync(path.join(workspacePath, a));
		}
	});

	// __uuidof -> IID_PPV_ARGS
	registerCommand('extension.replaceUuids', () => {
		// regex __uuidof\(.*\), reinterpret_cast<void \*\*>\((.*)\)
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			showInformationMessage('No active text editor');
		}
		else {
			editor.edit(edit => {
				let range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(editor.document.lineCount, 0));
				let text = editor.document.getText(range);

				let pattern = /__uuidof\(.*\), reinterpret_cast<void \*\*>\((.*)\)/g;
				text = text.replace(pattern, 'IID_PPV_ARGS($1)');
				edit.replace(range, text);
			});
		}
	});

	registerCommand('extension.cleanupCppHeader', () => {
		let editor = vscode.window.activeTextEditor;
		// replace BOOL with int (with word boundary)
		let edit = new vscode.WorkspaceEdit();
		let text = editor.document.getText();
		// https://www.freecodecamp.org/news/regular-expressions-for-beginners/
		text = text.replace(/\bBOOL\b/g, 'int');
		text = text.replace(/\bLONG\b/g, 'int');
		text = text.replace(/\bDWORD\b/g, 'int');
		text = text.replace(/\bUINT\b/g, 'int');
		text = text.replace(/\bULONG\b/g, 'int');
		// replace long with int
		text = text.replace(/\blong\b/g, 'int');
		// don't forget to #define long long long
		text = text.replace(/\bLRESULT\b/g, 'long');
		text = text.replace(/\bWPARAM\b/g, 'long');
		text = text.replace(/\bLPARAM\b/g, 'long');
		text = text.replace(/\bLPVOID\b/g, 'void *');
		text = text.replace(/\bLPCVOID\b/g, 'const void *');
		text = text.replace(/\bLPCSTR\b/g, 'const char *');
		text = text.replace(/\bLPCWSTR\b/g, 'const wchar_t *');
		text = text.replace(/\bLPSTR\b/g, 'char *');
		text = text.replace(/\bLPWSTR\b/g, 'wchar_t *');
		text = text.replace(/\bLPCTSTR\b/g, 'const char *');
		text = text.replace(/\bLPTSTR\b/g, 'char *');
		text = text.replace(/\bHANDLE\b/g, 'void *');
		text = text.replace(/\bHINSTANCE\b/g, 'void *');
		text = text.replace(/\bHWND\b/g, 'void *');
		text = text.replace(/\bATOM\b/g, 'short');
		text = text.replace(/\bHMODULE\b/g, 'void *');
		text = text.replace(/\bHKEY\b/g, 'void *');
		text = text.replace(/\bHDC\b/g, 'void *');
		text = text.replace(/\bHBRUSH\b/g, 'void *');
		text = text.replace(/\bHFONT\b/g, 'void *');
		text = text.replace(/\bHICON\b/g, 'void *');
		text = text.replace(/\bHCURSOR\b/g, 'void *');
		text = text.replace(/\bHMENU\b/g, 'void *');
		text = text.replace(/\bWINAPI\b/g, '');
		text = text.replace(/\bCALLBACK\b/g, '');
		text = text.replace(/\bAPIENTRY\b/g, '');
		text = text.replace(/\bSHORT\b/g, 'short');
		text = text.replace(/\bWORD\b/g, 'short');
		text = text.replace(/\bBYTE\b/g, 'char');
		text = text.replace(/\bLPMSG\b/g, 'MSG *');
		// find hex numbers and replace them with lowercase
		text = text.replace(/\b0x[0-9A-F]+\b/g, match => match.toLowerCase());
		// replace typedef enum, typedef struct, typedef union
		text = text.replace(/\btypedef enum\b/g, 'enum');
		text = text.replace(/\btypedef struct\b/g, 'struct');
		text = text.replace(/\btypedef union\b/g, 'union');

		// replace tag(.*) with $1
		text = text.replace(/\btag(.*)\b/g, '$1');

		// C cleanup
		// _Check_return_
		text = text.replace(/\b_Check_return_\b/g, '');

		// _Check_return_opt_
		text = text.replace(/\b_Check_return_opt_\b/g, '');
		// _ACRTIMP
		text = text.replace(/\b_ACRTIMP\b/g, '');

		// _CRTIMP
		text = text.replace(/\b_CRTIMP\b/g, '');

		// _In_
		text = text.replace(/\b_In_\b/g, '');

		// _In_opt_
		text = text.replace(/\b_In_opt_\b/g, '');
		text = text.replace(/\b_Inout_opt_\b/g, '');
		// _In_z_
		text = text.replace(/\b_In_z_\b/g, '');
		

		// _Inout_
		text = text.replace(/\b_Inout_\b/g, '');

		// _Inout_opt_
		text = text.replace(/\b_Inout_opt_\b/g, '');

		// _Out_
		text = text.replace(/\b_Out_\b/g, '');

		// _Out_opt_
		text = text.replace(/\b_Out_opt_\b/g, '');

		// _Outptr_
		text = text.replace(/\b_Outptr_\b/g, '');

		// _Outptr_opt_

		text = text.replace(/\b_Outptr_opt_\b/g, '');

		// _Outptr_result_maybenull_
		text = text.replace(/\b_Outptr_result_maybenull_\b/g, '');

		//__CRTDECL
		text = text.replace(/\b__CRTDECL\b/g, '');

		// _CRT_STDIO_INLINE
		text = text.replace(/\b_CRT_STDIO_INLINE\b/g, '');

		// _Success_(.*) (for some reason word boundary doesn't work here, it's a bug in the matching algorithm)
		text = text.replace(/_Success_\(.*\)/g, '');

		// __cdecl
		text = text.replace(/\b__cdecl\b/g, '');


		console.log(text);
		edit.replace(editor.document.uri, new vscode.Range(0, 0, editor.document.lineCount, 0), text);
		vscode.workspace.applyEdit(edit);
	});

	registerCommand("extension.toggleSubsystemWindows", () => {
		// find .vscode/tasks.json
		// replace the subsystem with windows
		// if not found, create a new one	
		let workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;

		let tasksPath = path.join(workspacePath, '.vscode', 'tasks.json');

		// read the tasks.json
		let tasks = parse(fs.readFileSync(tasksPath, 'utf-8'));

		// get the array tasks[0].args
		let args = tasks.tasks[0].args;
		// find the /subsystem:windows
		let index = args.indexOf('/subsystem:windows');
		if (index == -1) {
			args.push('/subsystem:windows');
			showInformationMessage('Added /subsystem:windows');
		}
		else {
			args.splice(index, 1);
			showInformationMessage('Removed /subsystem:windows');
		}
		fs.writeFileSync(tasksPath, stringify(tasks, null, 4));
	});
}

function deactivate() { }


module.exports = {
	activate,
	deactivate
}
