# @penqwin/mcp

An AST-based Model Context Protocol (MCP) server that provides token-efficient codebase skeletons to LLM agents (like Cursor, Claude Desktop, and Antigravity).

Instead of sending full raw source code files to the LLM, this server exposes structural "skeletons" (imports, exports, signatures, and JSDoc comments) of files and directories. This reduces token context sizes by **80% to 95%** during codebase exploration and navigation.

---

## Features & Tools

The server registers 5 core tools with the MCP protocol:

| Tool Name             | Description                                                                                                       |
| :-------------------- | :---------------------------------------------------------------------------------------------------------------- |
| `get_repo_index`      | Returns a compact Table of Contents of the repository (all files + top-level exported names). ~10–20 tokens/file. |
| `get_folder_skeleton` | Retrieves structural skeletons for all files matching a directory/folder prefix.                                  |
| `get_file_skeleton`   | Retrieves the detailed structural skeleton (signatures, types, methods, parameters, and JSDocs) of a single file. |
| `search_symbols`      | Queries the AST index to find files that export a specific class, function, struct, or type.                      |
| `get_repo_stats`      | Returns aggregate statistics of the repository, including file counts and language breakdown.                     |

---

## Configuration

The MCP server is configured entirely via environment variables.

| Environment Variable | Description                                       | Example                  |
| :------------------- | :------------------------------------------------ | :----------------------- |
| `PENQWIN_API_KEY`    | Machine-to-machine API key generated from the DB  | `ed_live_0e21cf14...`    |
| `PENQWIN_ORG_ID`     | The organization ID associated with the API key   | `0db9f7b5-7206-...`      |
| `PENQWIN_REPO`       | The repository owner and name to target           | `<org_name>/<repo_name>` |
| `PENQWIN_API_URL`    | The REST API gateway URL of the `penqwin` backend | `http://app.penqwin.com` |

---

## IDE Integrations

You can integrate this MCP server with your favorite IDE using either **npx** (highly recommended for end-users, as it doesn't require cloning/building) or by pointing to your **local build**.

### 1. Direct Integration (via npm/npx)

This is the easiest setup for users. The IDE will automatically fetch and run the latest version of the package.

#### Cursor

Go to **Cursor Settings** -> **Features** -> **MCP**, and click **+ Add New MCP Server**:

- **Name**: `penqwin`
- **Type**: `command`
- **Command**: `npx -y @penqwin/mcp`
- Add the required environment variables under the **env** settings.

#### Antigravity / Gemini Code Assistant

Add this to your `mcp_config.json`:

```json
{
  "mcpServers": {
    "penqwin": {
      "command": "npx",
      "args": ["-y", "@penqwin/mcp"],
      "env": {
        "PENQWIN_API_KEY": "your_api_key",
        "PENQWIN_ORG_ID": "your_org_id",
        "PENQWIN_REPO": "your_repo",
        "PENQWIN_API_URL": "https://app.penqwin.com"
      }
    }
  }
}
```

#### Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "penqwin": {
      "command": "npx",
      "args": ["-y", "@penqwin/mcp"],
      "env": {
        "PENQWIN_API_KEY": "your_api_key",
        "PENQWIN_ORG_ID": "your_org_id",
        "PENQWIN_REPO": "your_repo",
        "PENQWIN_API_URL": "https://app.penqwin.com"
      }
    }
  }
}
```

---

### 2. Local Source Integration

If you have cloned the repository locally and compiled it:

#### Cursor

- **Command**: `node d:/Projects/EngDoc/eng-doc-mcp/dist/index.js` (Use forward slashes for Windows paths)

#### Antigravity / Claude Desktop

- **Command**: `node`
- **Args**: `["d:/Projects/EngDoc/eng-doc-mcp/dist/index.js"]`

---

Learn more:

- [Penqwin MCP](https://www.penqwin.com/mcp)
- [MCP Protocol](https://modelcontextprotocol.io/docs/getting-started)
- [Model Context Protocol - Wikipedia](https://en.wikipedia.org/wiki/Model_Context_Protocol)
