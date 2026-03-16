#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="${ROOT_DIR}/deployment"
BUILD_DIR="${DEPLOY_DIR}/build"

IMAGE_NAME="${IMAGE_NAME:-student-grouping}"
PLATFORM="${PLATFORM:-linux/amd64}"
ARCHIVE_NAME="${ARCHIVE_NAME:-${IMAGE_NAME}.tar.gz}"
MANIFEST_NAME="${MANIFEST_NAME:-${IMAGE_NAME}.manifest.env}"

runtime_available() {
  local runtime="$1"
  if ! command -v "${runtime}" >/dev/null 2>&1; then
    return 1
  fi

  case "${runtime}" in
    podman)
      "${runtime}" info >/dev/null 2>&1
      ;;
    docker)
      "${runtime}" info >/dev/null 2>&1
      ;;
    *)
      "${runtime}" info >/dev/null 2>&1
      ;;
  esac
}

if [[ -n "${CONTAINER_CLI:-}" ]]; then
  CLI="${CONTAINER_CLI}"
  if ! runtime_available "${CLI}"; then
    echo "指定的容器工具不可用: ${CLI}" >&2
    exit 1
  fi
elif runtime_available podman; then
  CLI="podman"
elif runtime_available docker; then
  CLI="docker"
else
  echo "未找到可用的 podman 或 docker 运行时。" >&2
  echo "请启动 podman machine / Docker Desktop，或通过 CONTAINER_CLI 显式指定可用工具。" >&2
  exit 1
fi

GIT_SHA="$(git -C "${ROOT_DIR}" rev-parse --short HEAD 2>/dev/null || echo unknown)"
if git -C "${ROOT_DIR}" diff --quiet --ignore-submodules HEAD -- 2>/dev/null; then
  DIRTY_SUFFIX=""
else
  DIRTY_SUFFIX="-dirty"
fi
BUILD_TIME_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
IMAGE_TAG="${IMAGE_TAG:-$(date +"%Y%m%d-%H%M%S")-${GIT_SHA}${DIRTY_SUFFIX}}"
ARCHIVE_PATH="${BUILD_DIR}/${ARCHIVE_NAME}"
MANIFEST_PATH="${BUILD_DIR}/${MANIFEST_NAME}"

mkdir -p "${BUILD_DIR}"
rm -f "${BUILD_DIR}/${IMAGE_NAME}.tar" "${ARCHIVE_PATH}" "${MANIFEST_PATH}"

if [[ "${SKIP_APP_BUILD:-0}" != "1" ]]; then
  echo "==> 本地构建前端产物"
  (
    cd "${ROOT_DIR}"
    npm run build
  )
fi

echo "==> 使用 ${CLI} 构建 ${IMAGE_NAME}:${IMAGE_TAG} (${PLATFORM})"
"${CLI}" build \
  --platform "${PLATFORM}" \
  -f "${DEPLOY_DIR}/Dockerfile" \
  -t "${IMAGE_NAME}:${IMAGE_TAG}" \
  -t "${IMAGE_NAME}:latest" \
  "${ROOT_DIR}"

echo "==> 导出镜像归档"
if [[ "${CLI}" == "podman" ]]; then
  "${CLI}" save \
    --format docker-archive \
    -o "${BUILD_DIR}/${IMAGE_NAME}.tar" \
    "${IMAGE_NAME}:${IMAGE_TAG}" \
    "${IMAGE_NAME}:latest"
else
  "${CLI}" save \
    -o "${BUILD_DIR}/${IMAGE_NAME}.tar" \
    "${IMAGE_NAME}:${IMAGE_TAG}" \
    "${IMAGE_NAME}:latest"
fi

gzip -f "${BUILD_DIR}/${IMAGE_NAME}.tar"

cat > "${MANIFEST_PATH}" <<EOF
IMAGE_NAME=${IMAGE_NAME}
IMAGE_TAG=${IMAGE_TAG}
PLATFORM=${PLATFORM}
ARCHIVE_NAME=${ARCHIVE_NAME}
BUILD_TIME_UTC=${BUILD_TIME_UTC}
GIT_COMMIT=${GIT_SHA}
CONTAINER_CLI=${CLI}
EOF

echo "==> 构建完成"
echo "镜像标签: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "归档文件: ${ARCHIVE_PATH}"
echo "构建清单: ${MANIFEST_PATH}"
