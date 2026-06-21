// src/client.ts
// HTTP client that wraps all /api/mcp/* calls to the Penqwin backend.
// Uses native fetch (Node 20+ built-in) — no extra dependencies.

import type { Config } from "./config.js";

export interface SymbolSearchResult {
  count: number;
  results: Array<{
    filePath: string;
    language: string;
    kind: string;
    signature?: string;
    jsdoc?: string;
  }>;
}

export interface RepoStats {
  totalFiles: number;
  byLanguage: Record<string, number>;
}

export class PenqwinClient {
  private readonly headers: Record<string, string>;
  private readonly appUrl: string;
  private readonly repo: string;

  constructor(config: Config) {
    this.appUrl = config.appUrl;
    this.repo = config.repo;
    this.headers = {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  // ── Private helper ────────────────────────────────────────────────────────

  private async get<T>(
    path: string,
    params: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${this.appUrl}${path}`);
    url.searchParams.set("repo", this.repo);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const res = await fetch(url.toString(), { headers: this.headers });

    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      throw new Error(`[penqwin-mcp] API error ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
  }

  // ── Public API methods ────────────────────────────────────────────────────

  async getRepoIndex(includeStats = false): Promise<string> {
    const data = await this.get<{ index: string; stats?: RepoStats }>(
      "/api/mcp/index",
      includeStats ? { stats: "true" } : {},
    );
    if (includeStats && data.stats) {
      const statsLines = Object.entries(data.stats.byLanguage)
        .sort(([, a], [, b]) => b - a)
        .map(([lang, count]) => `- ${lang}: ${count}`);
      return [
        data.index,
        "\n---\n## Stats",
        `**Total files**: ${data.stats.totalFiles}`,
        ...statsLines,
      ].join("\n");
    }
    return data.index;
  }

  async getFolderSkeleton(folder: string): Promise<string> {
    const data = await this.get<{ markdown: string }>("/api/mcp/skeleton", {
      folder,
    });
    return data.markdown;
  }

  async getFileSkeleton(file: string): Promise<string> {
    const data = await this.get<{ markdown: string }>("/api/mcp/skeleton", {
      file,
    });
    return data.markdown;
  }

  async searchSymbols(symbol: string): Promise<SymbolSearchResult> {
    const data = await this.get<{
      count: number;
      results: SymbolSearchResult["results"];
    }>("/api/mcp/search", { symbol });
    return data;
  }

  async getRepoStats(): Promise<RepoStats> {
    const data = await this.get<{ stats: RepoStats }>("/api/mcp/index", {
      stats: "true",
    });
    return data.stats ?? { totalFiles: 0, byLanguage: {} };
  }
}
