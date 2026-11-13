# usage-timer

A Claude Code mod that shows how long your session has been running and how much of your usage limits you've used.

It adds a **Usage timer** pane beside the chat and a matching line in the status line:

- **Session time**: a timer that counts up every second.
- **5-hour limit** and **Weekly limit**: a bar with the percentage used (green, yellow from 70%, red from 90%) and a countdown to when each limit resets. These appear after Claude's first reply, on subscription plans.
- **Session cost**: shown once it is above $0.

The pane opens by itself when a session starts. Type `/usage-timer` to open it again after closing it.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install usage-timer --marketplace eddypokss/claude-usage-timer
```

Answer `y` to add the marketplace, then pick a scope (user scope is first; press Enter).

From a shell:

```bash
claude plugin install usage-timer --marketplace eddypokss/claude-usage-timer
```

In the Claude desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `eddypokss/claude-usage-timer`, then **Add plugin**.

## License

MIT
