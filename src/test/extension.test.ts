import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { LineComment } from '../types';
import { loadComments, putComment } from '../extension';

suite('Extension Test Suite', () => {
	let context: vscode.ExtensionContext;

	suiteSetup(async () => {
		const ext = vscode.extensions.getExtension('ayaankazerouni.vscode-review')!;
		await ext.activate();
		context = ext.exports.context;
	});

	test('should load comments from workspace state', async () => {
		// Pre-populate workspace state
		const testComment: LineComment = {
			commentId: 'test-id',
			commentText: 'Test comment',
			filePath: 'testfile.js',
			startLine: 1,
			endLine: 2
		};
		putComment(context, testComment);

		// Load comments
		const comments = loadComments(context) as LineComment[];
		assert.strictEqual(comments.length, 1);
		assert.strictEqual(comments[0].startLine, 1);
		assert.strictEqual(comments[0].endLine, 2);
		assert.strictEqual(comments[0].commentText, 'Test comment');
		assert.strictEqual(comments[0].filePath, 'testfile.js');
	});
});
