# Contract: connecting an agent

`ctour mcp install` detects the agents on this machine and edits each one's own
configuration so it can start `ctour mcp`. `ctour doctor` reports the same facts and
changes nothing.

## Agents

| Agent       | Configuration path        | Format | Entry                 |
| ----------- | ------------------------- | ------ | --------------------- |
| Claude Code | `~/.claude.json`          | JSON   | `mcpServers.ctour`    |
| Cursor      | `~/.cursor/mcp.json`      | JSON   | `mcpServers.ctour`    |
| Gemini CLI  | `~/.gemini/settings.json` | JSON   | `mcpServers.ctour`    |
| Codex       | `~/.codex/config.toml`    | TOML   | `[mcp_servers.ctour]` |

Detection is by the presence of the file or its parent directory, never by `PATH`.
An agent is "detected" when its configuration exists; that is the only case in which
`install` writes to it.

## The entry

JSON:

```json
{ "command": "/home/me/.local/bin/ctour", "args": ["mcp"] }
```

TOML:

```toml
[mcp_servers.ctour]
command = "/home/me/.local/bin/ctour"
args = ["mcp"]
```

`command` is the absolute path of the running executable when it resolves on disk;
otherwise the literal `ctour`. `args` is always `["mcp"]`.

## Editing rules

1. **Only the entry is touched.** Everything before and after it in the file is
   copied through unchanged, byte for byte.
2. **JSON**: the entry is spliced into an existing `mcpServers` object, or a new
   `mcpServers` object is spliced into the root object. The root object is never
   re-serialized. After the splice the file must parse, and every pre-existing
   top-level key must still be present with an equal value; otherwise the write is
   abandoned and the original file is restored before exiting 3.
3. **TOML**: the block is appended as the last lines of the file, preceded by one
   blank line. If `[mcp_servers.ctour]` already appears, the block is not appended;
   if `mcp_servers` appears in inline form, the command exits 3 and names the line.
4. **No other file is written.** No directory is created for an agent that was not
   detected.
5. **Idempotent**: when the entry is already present with the same `command` and
   `args`, nothing is written and the file's bytes and modification time are
   unchanged.

## Output

One line per detected agent, aligned like the rest of the command's output:

```text
ctour 0.1.0
claude-code  connected   /home/me/.claude.json
codex        updated     /home/me/.codex/config.toml
restart the agent; it will find the map through ctour mcp
```

`already connected` replaces `connected` when nothing was written. With no agent
detected:

```text
ctour 0.1.0
no agent found
add this to ~/.claude.json:
  {"mcpServers": {"ctour": {"command": "ctour", "args": ["mcp"]}}}
add this to ~/.codex/config.toml:
  [mcp_servers.ctour]
  command = "ctour"
  args = ["mcp"]
```

Unreadable configuration — the entry is still printed, because the person has to be
told what to add and where (FR-024):

```text
cannot read /home/me/.claude.json: nothing left after the entry
add this to /home/me/.claude.json:
  {"mcpServers": {"ctour": {"command": "ctour", "args": ["mcp"]}}}
```

## Exit codes

| Code | Meaning                                                                      |
| ---- | ---------------------------------------------------------------------------- |
| 0    | connected, updated, or already connected                                     |
| 2    | usage                                                                        |
| 3    | a configuration was detected but could not be edited safely; it is unchanged |
| 5    | no agent detected; nothing written                                           |

With several detected agents the first failure wins: 3 beats 5 beats 0.

## `ctour doctor`

One check per detected agent, id `agent:<name>`:

```text
agent:claude-code  ok    connected in /home/me/.claude.json
agent:codex        ok    not connected; run `ctour mcp install`
agent:cursor       FAIL  /home/me/.cursor/mcp.json points at /old/ctour, which is gone; run `ctour mcp install`
```

`doctor` never writes. `doctor --json` includes the same checks with the existing
`{ id, ok, detail, fix }` shape.
