/**
 * Used for project-wide comments.
 */
export interface Comment {
  commentId: string;
  commentText: string; // Markdown formatted text
}

/**
 * FileComments are used for file-level comments.
 */
export interface FileComment extends Comment {
  filePath: string; // Relative file path in the workspace
}

/**
 * LineComments are used for comments associated with specific line ranges in a file.
 */
export interface LineComment extends FileComment {
  startLine: number; // 1-based line number
  endLine: number;   // 1-based line number, inclusive. Potentially same as startLine for single line comments
}
