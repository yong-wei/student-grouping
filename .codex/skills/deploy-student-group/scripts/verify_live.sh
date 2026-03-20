#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"

REMOTE_HOST="${REMOTE_HOST:-root@121.40.124.135}"
SERVICE_NAME="${SERVICE_NAME:-student-grouping}"
CONTAINER_NAME="${CONTAINER_NAME:-student-grouping}"
PUBLIC_URL="${PUBLIC_URL:-https://group.adapt-learn.online}"
LOCAL_PORT="${LOCAL_PORT:-8081}"
SSH_BASE_ARGS=(
  -T
  -o BatchMode=yes
  -o ConnectTimeout=10
  -o ServerAliveInterval=15
  -o ServerAliveCountMax=3
)

local_asset="$(
  sed -n 's/.*src="\(\/*assets\/index-[^"]*\.js\)".*/\1/p' "${ROOT_DIR}/dist/index.html" | head -n 1
)"

if [[ -z "${local_asset}" ]]; then
  echo "Could not extract the local main asset from dist/index.html" >&2
  exit 1
fi

echo "==> Remote service status"
ssh "${SSH_BASE_ARGS[@]}" "${REMOTE_HOST}" "
  set -euo pipefail
  systemctl is-active '${SERVICE_NAME}'
  podman ps -a --filter name='${CONTAINER_NAME}' --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
  echo '--- local health ---'
  curl -fsS --retry 5 --retry-delay 2 --retry-connrefused 'http://127.0.0.1:${LOCAL_PORT}/health'
  echo
"

echo "==> Public endpoint headers"
curl -fsSI "${PUBLIC_URL}" | sed -n '1,12p'

echo "==> Public asset check"
public_asset="$(
  curl -fsSL "${PUBLIC_URL}" | sed -n 's/.*src="\(\/*assets\/index-[^"]*\.js\)".*/\1/p' | head -n 1
)"

if [[ -z "${public_asset}" ]]; then
  echo "Could not extract the public main asset from ${PUBLIC_URL}" >&2
  exit 1
fi

echo "local asset : ${local_asset}"
echo "public asset: ${public_asset}"

if [[ "${local_asset}" != "${public_asset}" ]]; then
  echo "Public site does not match the current local build." >&2
  exit 1
fi

echo "Verification passed."
