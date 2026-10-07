/* Basic styling for rendered markdown content */
.markdown-content {
  line-height: 1.6;
  color: #24292e;
  font-size: 16px;
  max-width: 100%;
  word-wrap: break-word;
}

.markdown-content h1,
.markdown-content h2,
.markdown-content h3,
.markdown-content h4,
.markdown-content h5,
.markdown-content h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
  color: #1a1a1a;
}

.markdown-content h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
.markdown-content h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
.markdown-content h3 { font-size: 1.25em; }
.markdown-content h4 { font-size: 1em; }
.markdown-content h5 { font-size: 0.875em; }
.markdown-content h6 { font-size: 0.85em; color: #6a737d; }

.markdown-content p {
  margin-top: 0;
  margin-bottom: 16px;
}

.markdown-content a {
  color: #0366d6;
  text-decoration: none;
}

.markdown-content a:hover {
  text-decoration: underline;
}

.markdown-content code {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(27, 31, 35, 0.05);
  border-radius: 3px;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
}

.markdown-content pre {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: #f6f8fa;
  border-radius: 3px;
  margin-top: 0;
  margin-bottom: 16px;
}

.markdown-content pre code {
  padding: 0;
  margin: 0;
  font-size: 100%;
  word-break: normal;
  white-space: pre;
  background: transparent;
  border: 0;
}

.markdown-content blockquote {
  padding: 0 1em;
  color: #6a737d;
  border-left: 0.25em solid #dfe2e5;
  margin: 0 0 16px;
}

.markdown-content ul,
.markdown-content ol {
  padding-left: 2em;
  margin-top: 0;
  margin-bottom: 16px;
}

.markdown-content li {
  margin-bottom: 4px;
}

.markdown-content table {
  display: block;
  width: 100%;
  overflow: auto;
  margin-bottom: 16px;
  border-spacing: 0;
  border-collapse: collapse;
}

.markdown-content table th,
.markdown-content table td {
  padding: 6px 13px;
  border: 1px solid #dfe2e5;
}

.markdown-content table th {
  font-weight: 600;
  background-color: #f6f8fa;
}

.markdown-content table tr {
  background-color: #fff;
  border-top: 1px solid #c6cbd1;
}

.markdown-content table tr:nth-child(2n) {
  background-color: #f6f8fa;
}

.markdown-content img {
  max-width: 100%;
  box-sizing: content-box;
  background-color: #fff;
}

.markdown-content hr {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: #e1e4e8;
  border: 0;
}

.markdown-content .markdown-error {
  color: #cb2431;
  background-color: #ffeef0;
  border: 1px solid #f97583;
  padding: 12px 16px;
  border-radius: 6px;
  margin: 16px 0;
}

/* Task list styling */
.markdown-content input[type="checkbox"] {
  margin-right: 8px;
}

/* Syntax highlighting support (works with highlight.js or prism.js) */
.markdown-content .hljs {
  background: transparent;
  padding: 0;
}