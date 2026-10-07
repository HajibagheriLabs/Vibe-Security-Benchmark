import { app, shell } from 'electron';
import { URL } from 'node:url';

const ALLOWED_HOST = 'app.example.com';
const ALLOWED_ROUTES = new Set(['open', 'settings', 'help']);

interface ParsedDeepLink {
  route: string;
  params: Record<string, string>;
}

function parseDeepLink(rawUrl: string): ParsedDeepLink | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'myapp:') return null;
  if (parsed.hostname !== ALLOWED_HOST) return null;
  if (parsed.username || parsed.password) return null;

  const route = parsed.pathname.replace(/^\//, '');
  if (!route || !ALLOWED_ROUTES.has(route)) return null;

  const params: Record<string, string> = {};
  for (const [key, value] of parsed.searchParams.entries()) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)) return null;
    if (value.length > 256) return null;
    params[key] = value;
  }

  return { route, params };
}

function handleParsedLink(parsed: ParsedDeepLink): void {
  switch (parsed.route) {
    case 'open': {
      const id = parsed.params.id;
      if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return;
      break;
    }
    case 'settings': {
      const section = parsed.params.section;
      if (section && !/^[a-z]+$/.test(section)) return;
      break;
    }
    case 'help': {
      const topic = parsed.params.topic;
      if (topic && !/^[a-z-]+$/.test(topic)) return;
      break;
    }
  }
}

export function registerProtocolHandler(): void {
  if (process.defaultApp) return;

  const argv = process.argv.slice(1);
  for (const arg of argv) {
    if (!arg.startsWith('myapp://')) continue;

    const parsed = parseDeepLink(arg);
    if (!parsed) continue;

    handleParsedLink(parsed);
  }
}

app.on('open-url', (_event, url: string) => {
  const parsed = parseDeepLink(url);
  if (!parsed) return;
  handleParsedLink(parsed);
});

app.on('second-instance', (_event, argv: string[]) => {
  for (const arg of argv.slice(1)) {
    if (!arg.startsWith('myapp://')) continue;
    const parsed = parseDeepLink(arg);
    if (!parsed) continue;
    handleParsedLink(parsed);
  }
});

app.setAsDefaultProtocolClient('myapp');