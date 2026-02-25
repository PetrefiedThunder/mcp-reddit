# mcp-reddit

Browse subreddits, search posts, read comments — no authentication required.

> **Free API** — No API key required.

## Tools

| Tool | Description |
|------|-------------|
| `get_hot` | Get hot posts from a subreddit. |
| `get_top` | Get top posts from a subreddit. |
| `search` | Search Reddit posts. |
| `get_comments` | Get comments on a post. |
| `get_subreddit_info` | Get subreddit metadata. |

## Installation

```bash
git clone https://github.com/PetrefiedThunder/mcp-reddit.git
cd mcp-reddit
npm install
npm run build
```

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "reddit": {
      "command": "node",
      "args": ["/path/to/mcp-reddit/dist/index.js"]
    }
  }
}
```

## Usage with npx

```bash
npx mcp-reddit
```

## License

MIT
