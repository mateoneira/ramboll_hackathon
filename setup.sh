#!/usr/bin/env bash
# Install the backend Python stack (GDAL, geopandas, ifcopenshell, assimp,
# trimesh, FastAPI, ...) into the managed AI-env from conda-forge.
set -e
export MAMBA_ROOT_PREFIX=/home/aiuser/AIHackathonEnvironment/micromamba-root
export PATH="/home/aiuser/AIHackathonEnvironment/micromamba/bin:$PATH"
cd "$(dirname "$0")"
micromamba install -y -n AI-env -c conda-forge -f backend/environment.yml
