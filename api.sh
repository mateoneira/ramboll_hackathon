#!/usr/bin/env bash
# Launch the FastAPI backend (uvicorn) using Python from the managed AI-env.
set -e
export MAMBA_ROOT_PREFIX=/home/aiuser/AIHackathonEnvironment/micromamba-root
export PATH="$MAMBA_ROOT_PREFIX/envs/AI-env/bin:$PATH"
cd "$(dirname "$0")/backend"
exec uvicorn app.main:app --reload --port 8000
