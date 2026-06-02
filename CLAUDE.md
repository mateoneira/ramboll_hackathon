# AI Hackathon Environment

This project was created by AI Hackathon Environment.

## Working folder

Project folder: `C:\Users\m.neira\Documents\MyProject`

## Required environment

Always use the single managed micromamba environment named `AI-env` inside Claude Code's containerized Linux shell.
Do not install packages globally.
Do not use system Python for project work.
The `AI-env` environment is first on PATH when Claude Code runs, and Claude has write access to it so package changes persist between sessions.

There is one project AI-env: the persistent Linux micromamba environment used by Claude Code at `/home/aiuser/AIHackathonEnvironment/micromamba-root/envs/AI-env` inside the dedicated WSL2 distro `AIHackathonEnvironment`.
Run Python commands with `/home/aiuser/AIHackathonEnvironment/micromamba-root/envs/AI-env/bin/python`, or just use `python` because that environment is first on PATH.
Claude can install packages into this AI-env with `micromamba install -n AI-env ...` or `python -m pip install ...`; changes persist between VS Code/Claude sessions.
Windows project path: `C:\Users\m.neira\Documents\MyProject`.
WSL project path: `/mnt/c/Users/m.neira/Documents/MyProject`.
Claude Code runs inside the WSL2 bubblewrap sandbox with this project mounted read-write.
The sandbox mounts the WSL AI-env and Claude home read-write, mounts product scripts read-only, and mounts common Windows user folders such as Documents, Downloads, Desktop, and Pictures read-only when available.
Claude Code is not started in bypass-permissions mode; approve actions when Claude Code asks.
The product-owned Claude home is at `/home/aiuser/AIHackathonEnvironment/claude-home` so workspace trust prompts stay suppressed without using dangerous mode.
The managed Claude PATH starts with `/home/aiuser/AIHackathonEnvironment/sandbox/bin:/home/aiuser/AIHackathonEnvironment/node/node_modules/.bin:/home/aiuser/AIHackathonEnvironment/node/bin:/home/aiuser/AIHackathonEnvironment/micromamba-root/envs/AI-env/bin:/home/aiuser/AIHackathonEnvironment/micromamba/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`.

## Isolation

Claude Code runs inside the platform-specific Linux isolation prepared by AI Hackathon Environment.
The project/current working directory is writable.
The single managed `AI-env` micromamba environment is writable so Claude can install packages and reuse them later.
Nearby user folders may be mounted read-only so Claude can inspect reference files without modifying them.
Host credential folders and the rest of the home directory are not mounted.
Do not try to run Claude Code directly on the host or bypass the AI Hackathon Environment launcher.

## Workflow

- Use Claude Code for AI coding.
- Use VS Code Source Control for commits, diffs, and rollbacks.
- Keep changes small and easy to undo.
- Check `git status` before and after making changes.
- Commit working save points with clear messages.

## Protected files

You may read files inside `modification-free/`, but do not change them unless the user explicitly asks.
