[ ] No credential in any client-reachable file (ALGOLIA_SEARCH_KEY used only in /api/search).
[ ] Every privileged third-party call (Algolia) runs server-side behind an authenticated, validated proxy.
[ ] .gitignore covers .env* (assumed present).
[ ] Data access derives identity from the verified session (`getServerSession`).
[ ] SQL/NoSQL: Algolia client uses bound parameters via method calls.
[ ] No banned DOM sink: Templates use string interpolation within Algolia's safe renderer.
[ ] Every logged user value is CRLF-stripped (in useEffect).
[ ] Dependencies: @algolia/client-search, @algolia/autocomplete-js, @algolia/autocomplete-core, @algolia/autocomplete-theme-classic.