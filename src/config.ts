// src/config.ts
// Reads all required configuration from environment variables.
// Set these in your IDE's MCP server config (env block).

export interface Config {
  apiKey: string;
  orgId: string;
  repo: string;
  appUrl: string;
}

export function loadConfig(): Config {
  const apiKey = process.env.PENQWIN_API_KEY;
  const orgId = process.env.PENQWIN_ORG_ID;
  const repo = process.env.PENQWIN_REPO;
  const appUrl = process.env.PENQWIN_API_URL ?? "https://app.penqwin.com";

  const missing: string[] = [];
  if (!apiKey) missing.push("PENQWIN_API_KEY");
  if (!orgId) missing.push("PENQWIN_ORG_ID");
  if (!repo) missing.push("PENQWIN_REPO");

  if (missing.length > 0) {
    throw new Error(
      `[penqwin-mcp] Missing required environment variables: ${missing.join(", ")}\n` +
        `Set these in your IDE MCP config under the "env" block.`,
    );
  }

  return {
    apiKey: apiKey!,
    orgId: orgId!,
    repo: repo!,
    appUrl: appUrl.replace(/\/$/, ""), // strip trailing slash
  };
}
