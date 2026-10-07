import algoliasearch from 'algoliasearch/lite';

const APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'YOUR_APP_ID';
const API_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || 'YOUR_SEARCH_API_KEY';

export const searchClient = algoliasearch(APP_ID, API_KEY);