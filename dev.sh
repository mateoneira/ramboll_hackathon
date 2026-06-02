#!/usr/bin/env bash
# Launch the frontend dev server (Vite) using Node from the managed AI-env.
set -e
export MAMBA_ROOT_PREFIX=/home/aiuser/AIHackathonEnvironment/micromamba-root
export PATH="$MAMBA_ROOT_PREFIX/envs/AI-env/bin:$PATH"
cd "$(dirname "$0")/frontend"
[ -d node_modules ] || npm install
exec npm run dev
