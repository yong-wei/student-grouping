#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="${ROOT_DIR}/deployment"
BUILD_DIR="${DEPLOY_DIR}/build"

REMOTE_HOST="${REMOTE_HOST:-root@121.40.124.135}"
REMOTE_DIR="${REMOTE_DIR:-/home/projects/student-group/images}"
SERVICE_NAME="${SERVICE_NAME:-student-grouping}"
CONTAINER_NAME="${CONTAINER_NAME:-student-grouping}"
LOCAL_PORT="${LOCAL_PORT:-8081}"
PUBLIC_URL="${PUBLIC_URL:-https://group.adapt-learn.online}"
MANIFEST_PATH="${MANIFEST_PATH:-${BUILD_DIR}/student-grouping.manifest.env}"

if [[ ! -f "${MANIFEST_PATH}" ]]; then
  echo "未找到构建清单: ${MANIFEST_PATH}" >&2
  echo "请先执行: bash deployment/build-image.sh" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "${MANIFEST_PATH}"

ARCHIVE_PATH="${BUILD_DIR}/${ARCHIVE_NAME}"
if [[ ! -f "${ARCHIVE_PATH}" ]]; then
  echo "未找到镜像归档: ${ARCHIVE_PATH}" >&2
  echo "请先执行: bash deployment/build-image.sh" >&2
  exit 1
fi

echo "==> 上传构建产物到 ${REMOTE_HOST}:${REMOTE_DIR}"
ssh "${REMOTE_HOST}" "mkdir -p '${REMOTE_DIR}'"
scp "${ARCHIVE_PATH}" "${MANIFEST_PATH}" "${REMOTE_HOST}:${REMOTE_DIR}/"

echo "==> 远端导入镜像并重启服务"
ssh "${REMOTE_HOST}" "bash -s" -- \
  "${REMOTE_DIR}" \
  "${ARCHIVE_NAME}" \
  "${IMAGE_NAME}" \
  "${IMAGE_TAG}" \
  "${SERVICE_NAME}" \
  "${CONTAINER_NAME}" \
  "${LOCAL_PORT}" <<'REMOTE_SCRIPT'
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
  echo "无法定位刚导入的镜像引用。" >&2
  exit 1
fi

podman tag "${SOURCE_REF}" "localhost/${IMAGE_NAME}:${IMAGE_TAG}"
podman tag "${SOURCE_REF}" "localhost/${IMAGE_NAME}:latest"

echo "---- systemctl restart ${SERVICE_NAME} ----"
systemctl restart "${SERVICE_NAME}"
systemctl is-active --quiet "${SERVICE_NAME}"

echo "---- 容器状态 ----"
podman ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

echo "---- 本机健康检查 ----"
curl -fsS --retry 5 --retry-delay 2 --retry-connrefused "http://127.0.0.1:${LOCAL_PORT}/health"
echo
REMOTE_SCRIPT

echo "==> 对外访问验证 ${PUBLIC_URL}"
curl -fsSI "${PUBLIC_URL}" | sed -n '1,10p'

echo "==> 部署完成"
echo "远端目录: ${REMOTE_HOST}:${REMOTE_DIR}"
echo "镜像标签: localhost/${IMAGE_NAME}:${IMAGE_TAG} / localhost/${IMAGE_NAME}:latest"
