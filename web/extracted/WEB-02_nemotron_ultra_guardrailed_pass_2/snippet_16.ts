src/app/globals.css
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; line-height: 1.5; min-height: 100vh; background: #f5f5f5; }
.main { max-width: 800px; margin: 0 auto; padding: 2rem 1rem; }
header { margin-bottom: 1.5rem; }
h1 { font-size: 1.75rem; font-weight: 600; }
.chat-container { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; flex-direction: column; height: 60vh; min-height: 400px; overflow: hidden; }
.messages { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
.message { max-width: 85%; padding: 0.75rem 1rem; border-radius: 12px; }
.message.user { align-self: flex-end; background: #0066cc; color: white; border-bottom-right-radius: 4px; }
.message.assistant { align-self: flex-start; background: #e5e5ea; color: #1d1d1f; border-bottom-left-radius: 4px; }
.message-content { white-space: pre-wrap; word-wrap: break-word; }
.input-form { display: flex; gap: 0.5rem; padding: 1rem; border-top: 1px solid #e5e5ea; background: #fafafa; }
.input-form input { flex: 1; padding: 0.625rem 1rem; border: 1px solid #d1d1d6; border-radius: 8px; font-size: 1rem; }
.input-form input:focus { outline: none; border-color: #0066cc; box-shadow: 0 0 0 3px rgba(0,102,204,0.2); }
.input-form button { padding: 0.625rem 1.25rem; border: none; border-radius: 8px; font-size: 1rem; font-weight: 500; cursor: pointer; transition: background 0.15s; }
.input-form button[type="submit"] { background: #0066cc; color: white; }
.input-form button[type="submit"]:hover:not(:disabled) { background: #0052a3; }
.input-form button[type="submit"]:disabled { opacity: 0.5; cursor: not-allowed; }
.input-form button[type="button"] { background: #ff3b30; color: white; }
.input-form button[type="button"]:hover { background: #cc2f26; }
.error { padding: 0.75rem 1rem; background: #ffe5e5; color: #cc0000; border-radius: 8px; margin: 0 1rem 1rem; font-size: 0.875rem; }
@media (max-width: 600px) { .main { padding: 1rem; } .chat-container { height: 70vh; } }