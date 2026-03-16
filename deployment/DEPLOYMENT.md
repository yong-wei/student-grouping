# Student Grouping 部署说明

本目录现在只保留实际部署所需文件：

```text
deployment/
├── Dockerfile
├── DEPLOYMENT.md
├── build/
│   └── .gitkeep
├── build-image.sh
├── deploy-remote.sh
└── docker/
    └── nginx.conf
```

## 当前线上真实配置

- 服务器：`root@121.40.124.135`
- 镜像名：`student-grouping`
- 容器名：`student-grouping`
- 远端镜像目录：`/home/projects/student-group/images`
- Podman 服务：`student-grouping.service`
- 容器端口映射：`8081 -> 80`
- 对外域名：`https://group.adapt-learn.online`
- 宿主机 Nginx：已在服务器端配置，反向代理到 `127.0.0.1:8081`

本地不再保留宿主机 Nginx/SSL 辅助脚本，因为现网配置已经固定在服务器端。

## 一次完整部署

### 1. 本地构建镜像归档

```bash
bash deployment/build-image.sh
```

默认行为：

- 先在本地执行 `npm run build`
- 自动优先使用 `podman`，若不存在则回退到 `docker`
- 构建 `linux/amd64` 镜像
- 打上两个标签：
  - `student-grouping:<时间戳-commit>`
  - `student-grouping:latest`
- 产出到 `deployment/build/`
  - `student-grouping.tar.gz`
  - `student-grouping.manifest.env`

可选环境变量：

```bash
CONTAINER_CLI=docker IMAGE_TAG=manual-tag bash deployment/build-image.sh
```

如需跳过本地前端构建，可显式设置：

```bash
SKIP_APP_BUILD=1 bash deployment/build-image.sh
```

### 2. 上传并在远端用 Podman 部署

```bash
bash deployment/deploy-remote.sh
```

脚本会自动：

1. 上传 `student-grouping.tar.gz` 和 manifest 到 `/home/projects/student-group/images`
2. 远端执行 `podman load`
3. 将导入镜像统一重标记为：
   - `localhost/student-grouping:<tag>`
   - `localhost/student-grouping:latest`
4. 重启 `student-grouping.service`
5. 验证：
   - 远端 `http://127.0.0.1:8081/health`
   - 对外 `https://group.adapt-learn.online`

可选环境变量：

```bash
REMOTE_HOST=root@121.40.124.135 \
REMOTE_DIR=/home/projects/student-group/images \
PUBLIC_URL=https://group.adapt-learn.online \
bash deployment/deploy-remote.sh
```

## 常用验证命令

### 本地

```bash
bash -n deployment/build-image.sh
bash -n deployment/deploy-remote.sh
find deployment -maxdepth 3 -type f | sort
```

### 远端

```bash
ssh root@121.40.124.135 'systemctl status student-grouping --no-pager'
ssh root@121.40.124.135 'podman ps --filter name=student-grouping'
ssh root@121.40.124.135 'ls -lah /home/projects/student-group/images'
curl -I https://group.adapt-learn.online
```

## 回滚

远端 `podman images` 已保留历史 tag。需要回滚时，可在服务器上执行：

```bash
ssh root@121.40.124.135
podman tag localhost/student-grouping:<旧tag> localhost/student-grouping:latest
systemctl restart student-grouping
```

如需重新上传旧版本，也可重新运行构建/部署脚本，只需先在本地指定旧版本源码并重新构建。

## 说明

- `deployment/build/` 是脚本运行时输出目录，不属于长期文档。
- `.dockerignore` 已排除 `deployment/build` 与归档产物，避免把历史镜像带入构建上下文。
- Dockerfile 只负责运行时镜像封装，前端构建在本地完成，避免在容器构建阶段执行 `npm ci` 时受外部网络波动影响。
- 容器内 Nginx 已提供 `/health`，供远端脚本和宿主机代理做快速探测。
