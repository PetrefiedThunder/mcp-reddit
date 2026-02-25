#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = "https://www.reddit.com";
const UA = "mcp-reddit/1.0.0";
const RATE_LIMIT_MS = 1000; // reddit is strict
let last = 0;

async function redditFetch(path: string): Promise<any> {
  const now = Date.now(); if (now - last < RATE_LIMIT_MS) await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - (now - last)));
  last = Date.now();
  const res = await fetch(`${BASE}${path}`, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Reddit ${res.status}`);
  return res.json();
}

const server = new McpServer({ name: "mcp-reddit", version: "1.0.0" });

server.tool("get_hot", "Get hot posts from a subreddit.", {
  subreddit: z.string().describe("Subreddit name (without r/)"),
  limit: z.number().min(1).max(100).default(10),
}, async ({ subreddit, limit }) => {
  const d = await redditFetch(`/r/${subreddit}/hot.json?limit=${limit}`);
  const posts = d.data?.children?.map((c: any) => {
    const p = c.data;
    return { title: p.title, author: p.author, score: p.score, url: p.url,
      selftext: p.selftext?.slice(0, 300), numComments: p.num_comments,
      created: new Date(p.created_utc * 1000).toISOString(), permalink: `https://reddit.com${p.permalink}` };
  });
  return { content: [{ type: "text" as const, text: JSON.stringify(posts, null, 2) }] };
});

server.tool("get_top", "Get top posts from a subreddit.", {
  subreddit: z.string(), time: z.enum(["hour", "day", "week", "month", "year", "all"]).default("week"),
  limit: z.number().min(1).max(100).default(10),
}, async ({ subreddit, time, limit }) => {
  const d = await redditFetch(`/r/${subreddit}/top.json?t=${time}&limit=${limit}`);
  const posts = d.data?.children?.map((c: any) => {
    const p = c.data;
    return { title: p.title, author: p.author, score: p.score, numComments: p.num_comments,
      permalink: `https://reddit.com${p.permalink}` };
  });
  return { content: [{ type: "text" as const, text: JSON.stringify(posts, null, 2) }] };
});

server.tool("search", "Search Reddit posts.", {
  query: z.string(), subreddit: z.string().optional(),
  sort: z.enum(["relevance", "hot", "top", "new", "comments"]).default("relevance"),
  time: z.enum(["hour", "day", "week", "month", "year", "all"]).default("all"),
  limit: z.number().min(1).max(100).default(10),
}, async ({ query, subreddit, sort, time, limit }) => {
  const path = subreddit ? `/r/${subreddit}/search.json` : `/search.json`;
  const p = new URLSearchParams({ q: query, sort, t: time, limit: String(limit), restrict_sr: subreddit ? "1" : "0" });
  const d = await redditFetch(`${path}?${p}`);
  const posts = d.data?.children?.map((c: any) => {
    const p = c.data;
    return { title: p.title, author: p.author, score: p.score, subreddit: p.subreddit,
      permalink: `https://reddit.com${p.permalink}` };
  });
  return { content: [{ type: "text" as const, text: JSON.stringify(posts, null, 2) }] };
});

server.tool("get_comments", "Get comments on a post.", {
  subreddit: z.string(), postId: z.string().describe("Post ID (e.g. '1abc23')"),
  limit: z.number().min(1).max(100).default(20),
}, async ({ subreddit, postId, limit }) => {
  const d = await redditFetch(`/r/${subreddit}/comments/${postId}.json?limit=${limit}`);
  const comments = d[1]?.data?.children?.filter((c: any) => c.kind === "t1").map((c: any) => {
    const p = c.data;
    return { author: p.author, score: p.score, body: p.body?.slice(0, 500),
      created: new Date(p.created_utc * 1000).toISOString() };
  });
  return { content: [{ type: "text" as const, text: JSON.stringify(comments, null, 2) }] };
});

server.tool("get_subreddit_info", "Get subreddit metadata.", {
  subreddit: z.string(),
}, async ({ subreddit }) => {
  const d = await redditFetch(`/r/${subreddit}/about.json`);
  const p = d.data;
  return { content: [{ type: "text" as const, text: JSON.stringify({
    name: p.display_name, title: p.title, description: p.public_description?.slice(0, 500),
    subscribers: p.subscribers, activeUsers: p.accounts_active, created: new Date(p.created_utc * 1000).toISOString(),
    nsfw: p.over18,
  }, null, 2) }] };
});

async function main() { const t = new StdioServerTransport(); await server.connect(t); }
main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
