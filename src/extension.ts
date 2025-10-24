import * as vscode from 'vscode';

import { randomUUID } from 'crypto';

import { Comment, FileComment, LineComment } from './types';

// This method is called when the extension is activated.
// Your extension is activated the very first time a command is executed.
export function activate(context: vscode.ExtensionContext) {
	vscode.commands.executeCommand('setContext', 'vscode-review.isReviewing', false);

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

	// Use the Comment API to set up commenting UI
	const commentController = vscode.comments.createCommentController('vscode-review', 'VSCode Review');
	commentController.options = {
		placeHolder: 'Write a comment here...'
	};
	commentController.commentingRangeProvider = {
		provideCommentingRanges: (document: vscode.TextDocument, token: vscode.CancellationToken): vscode.Range[] => {
			return [
				new vscode.Range(0, 0, document.lineCount, 0)
			];
		}
	};

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
			handleWriteComment(context, commentController);
		}),

		// Save comment: this command is triggered from a comment thread context menu.
		vscode.commands.registerCommand('vscode-review.saveComment', (comment: vscode.CommentReply) => {
			handleSaveNewComment(context, comment);
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
		dimDecorationType,

		// Comment controller
		commentController
	);

	return { context };
}

export function loadComments(context: vscode.ExtensionContext): Comment[] {
	return context.workspaceState.get<Comment[]>('vscode-review', []);
}

export function handleSaveNewComment(context: vscode.ExtensionContext, comment: vscode.CommentReply) {
	const { text, thread } = comment;
	if (thread.range) {
		const { start, end } = thread.range;
		const lineComment: LineComment = {
			commentId: randomUUID(),
			commentText: text,
			filePath: vscode.workspace.asRelativePath(thread.uri),
			startLine: start.line + 1, // Convert to 1-based
			endLine: end.line + 1      // Convert to 1-based
		};
		putComment(context, lineComment);
	}
}

export function handleWriteComment(context: vscode.ExtensionContext, commentController: vscode.CommentController) {
	const currentDocument = vscode.window.activeTextEditor?.document;
	const relativeFilePath = currentDocument ? vscode.workspace.asRelativePath(currentDocument.uri) : null;
	const selection = getSelection();

	if (currentDocument && relativeFilePath) {
		if (selection && !selection.isEmpty) {
			// Create a comment thread
			const range = new vscode.Range(selection.start, selection.end);
			const thread = commentController.createCommentThread(currentDocument.uri, range, []);
			thread.canReply = true;
			thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
		} else {
			// Create a comment thread for the whole file
			const fullRange = new vscode.Range(0, 0, currentDocument.lineCount, 0);
			const thread = commentController.createCommentThread(currentDocument.uri, fullRange, []);
			thread.canReply = true;
			thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;

			// Scroll the editor to the top
			const editor = vscode.window.activeTextEditor;
			if (editor) {
				const topPosition = new vscode.Position(0, 0);
				editor.revealRange(new vscode.Range(topPosition, topPosition), vscode.TextEditorRevealType.AtTop);
			}
		}
	} else {
		// Project-wide Comment
		vscode.window.showInformationMessage('Project-wide comments are not implemented yet.');
	}
}

/**
 * Update or add a comment in the workspace state.
 * 
 * @param context The extension context
 * @param comment The comment to add or update
 */
export function putComment(context: vscode.ExtensionContext, comment: Comment) {
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
