import * as vscode from 'vscode';

import { randomUUID } from 'crypto';

import { Comment, FileComment, LineComment } from './types';

// This method is called when the extension is activated.
// Your extension is activated the very first time a command is executed.
export function activate(context: vscode.ExtensionContext) {
	vscode.commands.executeCommand('setContext', 'vscode-review.isReviewing', false);

	const comments: Comment[] = loadComments(context);
	console.log('Loaded comments:', comments);

	// Set up the status bar item.
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);
	statusBarItem.text = "$(eye) REVIEWING";
	statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');

	// Create the text editor decoration type for dimming the editor to while in review mode.
	const dimDecorationType = vscode.window.createTextEditorDecorationType({
		opacity: '0.6',
		isWholeLine: true,
		rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
		cursor: 'default'
	});

	// State
	let isReviewing = false;

	// Commands and event listeners need to be pushed to this context's subscriptions
	// so that they're disposed when the extension is deactivated. 
	context.subscriptions.push(
		// Start review
		vscode.commands.registerCommand('vscode-review.startReview', () => {
			vscode.commands.executeCommand('setContext', 'vscode-review.isReviewing', true);
			isReviewing = true;
			statusBarItem.show();

			// Apply dim decoration to all open text editors
			vscode.window.visibleTextEditors.forEach(editor => {
				editor.setDecorations(dimDecorationType, [new vscode.Range(0, 0, editor.document.lineCount, 0)]);
			});
		}),

		// When a new editor is opened
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (isReviewing && editor) {
				// Apply dim decoration to the newly opened text editor
				editor.setDecorations(dimDecorationType, [new vscode.Range(0, 0, editor.document.lineCount, 0)]);
			}
		}),

		// Add comment: this command is only available when reviewing.
		vscode.commands.registerCommand('vscode-review.addComment', () => {
			handleSaveComment(context);
		}),

		// Stop review: this command is only available when reviewing.
		vscode.commands.registerCommand('vscode-review.stopReview', () => {
			vscode.commands.executeCommand('setContext', 'vscode-review.isReviewing', false);
			isReviewing = false;
			statusBarItem.hide();

			// Remove dim decoration from all open text editors
			vscode.window.visibleTextEditors.forEach(editor => {
				editor.setDecorations(dimDecorationType, []);
			});
		}),

		// Status bar item
		statusBarItem,

		// Decoration type
		dimDecorationType
	);
}

function loadComments(context: vscode.ExtensionContext): Comment[] {
	return context.workspaceState.get<Comment[]>('vscode-review', []);
}

function handleSaveComment(context: vscode.ExtensionContext) {
	const currentDocument = vscode.window.activeTextEditor?.document;
	const selection = getSelection();
	const commentId = randomUUID();

	const comments = loadComments(context);

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
}

/**
 * Update or add a comment in the workspace state.
 * 
 * @param context The extension context
 * @param comment The comment to add or update
 */
function putComment(context: vscode.ExtensionContext, comment: Comment) {
	const comments = loadComments(context);
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
