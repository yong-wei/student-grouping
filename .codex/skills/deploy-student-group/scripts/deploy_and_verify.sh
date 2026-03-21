#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"

BUILD_SCRIPT="${ROOT_DIR}/deployment/build-image.sh"
VERIFY_SCRIPT="${ROOT_DIR}/.codex/skills/deploy-student-group/scripts/verify_live.sh"
BUILD_DIR="${ROOT_DIR}/deployment/build"
MANIFEST_PATH="${MANIFEST_PATH:-${BUILD_DIR}/student-grouping.manifest.env}"

REMOTE_HOST="${REMOTE_HOST:-root@121.40.124.135}"
REMOTE_DIR="${REMOTE_DIR:-/home/projects/student-group/images}"
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
SCP_BASE_ARGS=(
  -B
  -o BatchMode=yes
  -o ConnectTimeout=10
  -o ServerAliveInterval=15
  -o ServerAliveCountMax=3
)
REMOTE_SCRIPT_PATH="$(mktemp)"
trap 'rm -f "${REMOTE_SCRIPT_PATH}"' EXIT

cat <<'REMOTE_SCRIPT' > "${REMOTE_SCRIPT_PATH}"
set -euo pipefail

REMOTE_DIR="$1"
ARCHIVE_NAME="$2"
IMAGE_NAME="$3"
IMAGE_TAG="$4"
SERVICE_NAME="$5"
CONTAINER_NAME="$6"
LOCAL_PORT="$7"

cd "${REMOTE_DIR}"

echo "---- podman load ----"
podman load -i "${ARCHIVE_NAME}"

SOURCE_REF=""
for candidate in \
  "localhost/${IMAGE_NAME}:${IMAGE_TAG}" \
  "docker.io/library/${IMAGE_NAME}:${IMAGE_TAG}" \
  "${IMAGE_NAME}:${IMAGE_TAG}" \
  "localhost/${IMAGE_NAME}:latest" \
  "docker.io/library/${IMAGE_NAME}:latest" \
  "${IMAGE_NAME}:latest"
do
  if podman image exists "${candidate}"; then
    SOURCE_REF="${candidate}"
    break
  fi
done

if [[ -z "${SOURCE_REF}" ]]; then
  echo "Could not find the imported image reference." >&2
  exit 1
fi

echo "using image: ${SOURCE_REF}"
podman tag "${SOURCE_REF}" "localhost/${IMAGE_NAME}:${IMAGE_TAG}"
podman tag "${SOURCE_REF}" "localhost/${IMAGE_NAME}:latest"

echo "---- systemctl restart ${SERVICE_NAME} ----"
systemctl restart "${SERVICE_NAME}"
systemctl is-active "${SERVICE_NAME}"

echo "---- podman ps ----"
podman ps -a --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

echo "---- local health ----"
curl -fsS --retry 5 --retry-delay 2 --retry-connrefused "http://127.0.0.1:${LOCAL_PORT}/health"
echo
REMOTE_SCRIPT

if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  echo "==> Build local artifact"
  bash "${BUILD_SCRIPT}"
fi

if [[ ! -f "${MANIFEST_PATH}" ]]; then
  echo "Missing manifest: ${MANIFEST_PATH}" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "${MANIFEST_PATH}"

ARCHIVE_PATH="${BUILD_DIR}/${ARCHIVE_NAME}"
if [[ ! -f "${ARCHIVE_PATH}" ]]; then
  echo "Missing archive: ${ARCHIVE_PATH}" >&2
  exit 1
fi

echo "==> Upload build outputs"
ssh "${SSH_BASE_ARGS[@]}" "${REMOTE_HOST}" "mkdir -p '${REMOTE_DIR}'"
scp "${SCP_BASE_ARGS[@]}" "${ARCHIVE_PATH}" "${MANIFEST_PATH}" "${REMOTE_HOST}:${REMOTE_DIR}/"

echo "==> Remote image load and service restart"
ssh "${SSH_BASE_ARGS[@]}" "${REMOTE_HOST}" "bash -s" -- \
  "${REMOTE_DIR}" \
  "${ARCHIVE_NAME}" \
  "${IMAGE_NAME}" \
  "${IMAGE_TAG}" \
  "${SERVICE_NAME}" \
  "${CONTAINER_NAME}" \
  "${LOCAL_PORT}" < "${REMOTE_SCRIPT_PATH}"

echo "==> Public verification"
REMOTE_HOST="${REMOTE_HOST}" \
SERVICE_NAME="${SERVICE_NAME}" \
CONTAINER_NAME="${CONTAINER_NAME}" \
PUBLIC_URL="${PUBLIC_URL}" \
LOCAL_PORT="${LOCAL_PORT}" \
bash "${VERIFY_SCRIPT}"

echo "==> Deploy completed"
echo "image tag: ${IMAGE_TAG}"
