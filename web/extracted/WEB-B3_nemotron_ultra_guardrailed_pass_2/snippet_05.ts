[ ] No credential in any client-reachable file.
[ ] No third-party calls; pure UI component.
[ ] .gitignore covers .env* (project level, not component level).
[ ] No database access / auth logic in component.
[ ] No SQL / injection vectors.
[ ] No banned DOM sinks (innerHTML, dangerouslySetInnerHTML); uses JSX interpolation.
[ ] CSP compatible (no inline styles/scripts required beyond Tailwind JIT).
[ ] No logging of user data.
[ ] Dependencies: react, react-dom only (standard lib / framework built-in).
[ ] Negative-path tests: N/A (UI component), but keyboard/outside-click handling implemented.