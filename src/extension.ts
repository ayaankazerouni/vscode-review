// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { randomUUID } from 'crypto';

import { Comment, FileComment, LineComment } from './types';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-review" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('vscode-review.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		// vscode.window.showInformationMessage('Hello World from vscode-review!');

		const currentDocument = vscode.window.activeTextEditor?.document;
		const selection = getSelection();
		const commentId = randomUUID();

		if (currentDocument) {
			if (selection && !selection.isEmpty) {
				// LineComment
				const startLine = selection.start.line + 1; // Convert to 1-based
				const endLine = selection.end.line + 1;     // Convert to 1-based
				const lineComment: LineComment = {
					commentId,
					commentText: 'This is a line comment',
					filePath: vscode.workspace.asRelativePath(currentDocument.uri),
					startLine,
					endLine
				};
				putComment(context, lineComment);
				vscode.window.showInformationMessage(`Added LineComment to ${currentDocument.fileName} from line ${startLine} to ${endLine}`);
			} else {
				// FileComment
				const fileComment: FileComment = {
					commentId,
					commentText: 'This is a file comment',
					filePath: vscode.workspace.asRelativePath(currentDocument.uri)
				};
				putComment(context, fileComment);
				vscode.window.showInformationMessage(`Added FileComment to ${currentDocument.fileName}`);
			}
		} else {
			// Project-wide Comment
			const projectComment: Comment = {
				commentId,
				commentText: 'This is a project-wide comment'
			};
			putComment(context, projectComment);
			vscode.window.showInformationMessage('Added Project-wide Comment');
		}
	});

	context.subscriptions.push(disposable);
}

/**
 * Update or add a comment in the workspace state.
 * 
 * @param context The extension context
 * @param comment The comment to add or update
 */
function putComment(context: vscode.ExtensionContext, comment: Comment) {
	const comments = context.workspaceState.get<Comment[]>('vscode-review', []);
	const found = comments.find(c => c.commentId === comment.commentId);
	if (found) {
		Object.assign(found, comment);
	} else {
		comments.push(comment);
	}
	context.workspaceState.update('vscode-review', comments);
}

function getSelection() {
	return vscode.window.activeTextEditor?.selection;
}

// This method is called when your extension is deactivated
export function deactivate() {}
