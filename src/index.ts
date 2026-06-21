#!/usr/bin/env node
// src/index.ts
// Penqwin MCP Server — exposes AST skeleton tools for LLMs.
// Communicates via stdio (compatible with Cursor, Claude Desktop, Windsurf, etc.)
//
// IDE Configuration example (mcp_config.json or claude_desktop_config.json):
// {
//   "mcpServers": {
//     "penqwin": {
//       "command": "npx",
//       "args": ["-y", "@penqwin/mcp"],
//       "env": {
//         "PENQWIN_API_KEY":  "ed_live_your_key_here",
//         "PENQWIN_ORG_ID":   "your-org-uuid",
//         "PENQWIN_REPO":     "owner/repo",
//         "PENQWIN_API_URL":  "https://app.penqwin.com"
//       }
//     }
//   }
// }

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig } from "./config.js";
import { PenqwinClient } from "./client.js";

async function main() {
  const config = loadConfig();
  const client = new PenqwinClient(config);

  const server = new McpServer({
    name: "penqwin",
    version: "0.1.0",
  });

  // ── Tool: get_repo_index ───────────────────────────────────────────────────
  server.tool(
    "get_repo_index",
    [
      `Returns a compact table-of-contents for the repository '${config.repo}'.`,
      "Lists all tracked source files with their exported symbol names.",
      "ALWAYS call this FIRST before any other tool to understand the repository structure.",
      "Use the file paths returned here as input to get_folder_skeleton or get_file_skeleton.",
      "Cost: ~10-20 tokens per file — very cheap.",
    ].join(" "),
    {
      include_stats: z
        .boolean()
        .optional()
        .describe("If true, also returns language breakdown and total file count."),
    },
    async ({ include_stats }) => {
      try {
        const index = await client.getRepoIndex(include_stats ?? false);
        return { content: [{ type: "text", text: index }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error fetching repo index: ${msg}` }], isError: true };
      }
    },
  );

  // ── Tool: get_folder_skeleton ──────────────────────────────────────────────
  server.tool(
    "get_folder_skeleton",
    [
      "Returns compact AST skeletons for all source files under a given folder path prefix.",
      "Use this to understand a module or feature area without reading raw source files.",
      "Skeletons include: exports, function signatures, type definitions, and doc comments.",
      "Cost: ~50 tokens per file — much cheaper than raw source code.",
      "Tip: call get_repo_index first to discover valid folder paths.",
    ].join(" "),
    {
      folder: z.string().describe(
        "Folder path prefix to fetch skeletons for. Example: 'src/auth', 'lib/utils'. Do NOT include a trailing slash.",
      ),
    },
    async ({ folder }) => {
      try {
        const markdown = await client.getFolderSkeleton(folder);
        return { content: [{ type: "text", text: markdown }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error fetching folder skeleton: ${msg}` }], isError: true };
      }
    },
  );

  // ── Tool: get_file_skeleton ────────────────────────────────────────────────
  server.tool(
    "get_file_skeleton",
    [
      "Returns the AST skeleton for a single specific source file.",
      "The skeleton includes: all exports with signatures, imports, class members, and doc comments.",
      "Use this when you need the details of one specific file after narrowing down from get_repo_index.",
      "For multiple related files, prefer get_folder_skeleton — it is one round trip.",
    ].join(" "),
    {
      file: z.string().describe(
        "Exact file path as it appears in the repository. Example: 'src/app/api/auth/route.ts'. Use the path from get_repo_index output.",
      ),
    },
    async ({ file }) => {
      try {
        const markdown = await client.getFileSkeleton(file);
        return { content: [{ type: "text", text: markdown }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error fetching file skeleton: ${msg}` }], isError: true };
      }
    },
  );

  // ── Tool: search_symbols ───────────────────────────────────────────────────
  server.tool(
    "search_symbols",
    [
      "Searches the entire repository for files that export a specific symbol name.",
      "Use this to find where a function, class, type, or interface is defined.",
      "Returns: file path, language, kind (function/class/type/etc.), signature, and doc comment.",
      "Example: search for 'createClient' to find all files that export a function by that name.",
    ].join(" "),
    {
      symbol: z.string().describe(
        "The exact exported symbol name to search for. Case-sensitive. Example: 'createClient', 'UserSchema', 'POST'.",
      ),
    },
    async ({ symbol }) => {
      try {
        const result = await client.searchSymbols(symbol);
        if (result.count === 0) {
          return {
            content: [{ type: "text", text: `No exported symbol named '${symbol}' found in ${config.repo}.` }],
          };
        }
        const lines = [
          `Found '${symbol}' in ${result.count} file(s) in ${config.repo}:\n`,
          ...result.results.map((r) => {
            const sig = r.signature ? ` — \`${r.signature}\`` : "";
            const doc = r.jsdoc ? `\n  > ${r.jsdoc.slice(0, 120)}` : "";
            return `- **${r.filePath}** [${r.language}] (${r.kind})${sig}${doc}`;
          }),
        ];
        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error searching symbols: ${msg}` }], isError: true };
      }
    },
  );

  // ── Tool: get_repo_stats ───────────────────────────────────────────────────
  server.tool(
    "get_repo_stats",
    [
      `Returns aggregate statistics for the repository '${config.repo}'.`,
      "Includes: total file count and a breakdown by programming language.",
      "Use this to understand the tech stack and scale of the codebase at a glance.",
    ].join(" "),
    {},
    async () => {
      try {
        const stats = await client.getRepoStats();
        const langLines = Object.entries(stats.byLanguage)
          .sort(([, a], [, b]) => b - a)
          .map(([lang, count]) => `- ${lang}: ${count} file(s)`);
        const text = [
          `## Repository Stats: ${config.repo}`,
          `**Total files**: ${stats.totalFiles}`,
          "",
          "**By language:**",
          ...langLines,
        ].join("\n");
        return { content: [{ type: "text", text: text }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error fetching repo stats: ${msg}` }], isError: true };
      }
    },
  );

  // ── Start server ───────────────────────────────────────────────────────────
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Server is now listening on stdin/stdout — IDE communicates via MCP protocol
}

main().catch((err) => {
  console.error("Failed to start Penqwin MCP server:", err);
  process.exit(1);
});
