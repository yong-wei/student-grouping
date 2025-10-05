# 部署文件清单

## ✅ 已生成的文件

### 📦 核心部署文件

| 文件 | 用途 | 说明 |
|------|------|------|
| `Dockerfile` | Docker 镜像构建文件 | 多阶段构建,Node.js 编译 + Nginx 服务,AMD64 架构 |
| `docker-compose.yml` | Docker Compose 配置 | 容器编排,端口映射 8081:80,Podman 兼容 |
| `.dockerignore` | 构建排除规则 | 排除 node_modules, logs, docs 等,减小镜像体积 |

### 🔧 部署脚本

| 脚本 | 功能 | 使用场景 |
|------|------|----------|
| `build.sh` | 构建 AMD64 镜像 | 本地 Mac ARM64 跨平台构建 |
| `deploy.sh` | 启动/重启容器 | 服务器上快速部署 |
| `save-image.sh` | 导出镜像为 tar.gz | 离线部署,上传到服务器 |
| `stop.sh` | 停止容器 | 维护时停止服务 |

### 📄 配置文件

#### 容器配置 (`nginx/`)
- `nginx/default.conf` - 容器内 Nginx 配置
  - SPA 路由支持 (try_files fallback)
  - 上传文件大小限制 50MB
  - Gzip 压缩
  - 静态资源缓存

#### 宿主机配置 (`nginx-vhost/`)
- `nginx-vhost/group.adapt-learn.online.conf` - Nginx 虚拟主机配置
  - HTTP 自动重定向 HTTPS
  - SSL/TLS 配置
  - 反向代理到容器 8081 端口
  - 安全响应头
- `nginx-vhost/ssl-setup.sh` - SSL 证书自动配置脚本
  - 自动安装 Certbot
  - 使用 Let's Encrypt 获取证书
  - 配置自动续期

### 📚 文档

| 文档 | 内容 | 目标读者 |
|------|------|----------|
| `README.md` | 部署包总览 | 首次接触部署包的人 |
| `QUICKSTART.md` | 5分钟快速部署 | 需要快速部署的用户 |
| `DEPLOYMENT.md` | 完整部署指南 | 需要详细了解每一步的用户 |

### 📁 源码目录

| 目录 | 说明 |
|------|------|
| `app/` | 项目完整源码,构建时使用 |

## 🎯 部署流程

```
1. 本地构建
   ├── build.sh          → 构建 AMD64 镜像
   └── save-image.sh     → 导出 student-grouping-amd64.tar.gz

2. 上传文件
   ├── scp *.tar.gz      → 上传镜像文件
   └── scp *.conf        → 上传配置文件

3. 服务器部署
   ├── podman load       → 导入镜像
   ├── podman run        → 启动容器
   ├── nginx config      → 配置反向代理
   └── ssl-setup.sh      → 配置 SSL 证书

4. 验证
   ├── http://121.40.124.135:8081
   └── https://group.adapt-learn.online
```

## 🌐 访问方式

部署完成后有以下访问方式:

1. **直接 IP 访问** (无需 Nginx 反向代理)
   - http://121.40.124.135:8081

2. **子域名访问** (需配置 Nginx 反向代理)
   - http://group.adapt-learn.online (自动重定向 HTTPS)
   - https://group.adapt-learn.online (推荐)

3. **原域名保持不变**
   - https://adapt-learn.online (原网站)

## 🔒 安全性

- ✅ HTTPS/SSL 支持 (Let's Encrypt 免费证书)
- ✅ 自动 HTTP → HTTPS 重定向
- ✅ 安全响应头 (HSTS, X-Frame-Options, CSP)
- ✅ 容器隔离
- ✅ 文件上传大小限制

## 📊 技术栈

### 构建环境
- **平台**: macOS (ARM64)
- **工具**: Docker / Podman
- **Node.js**: 20.18.1
- **构建工具**: Vite 7.x

### 运行环境
- **操作系统**: Alibaba Cloud Linux 3.2104 LTS
- **架构**: AMD64 (x86_64)
- **容器运行时**: Podman
- **Web 服务器**: Nginx 1.27 (Alpine)
- **反向代理**: Nginx (宿主机)

## 📐 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         互联网                               │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        │  阿里云服务器    │
        │  121.40.124.135 │
        │                 │
        └────────┬────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    │  Nginx (宿主机)          │
    │  - Port 80/443          │
    │  - SSL 终止              │
    │  - 虚拟主机路由          │
    │                         │
    └────┬────────────────────┘
         │
    ┌────┴──────────────────────────────┐
    │                                   │
┌───┴───────────┐          ┌──────────┴─────────┐
│ adapt-learn   │          │ group.adapt-learn  │
│ .online       │          │ .online            │
│               │          │                    │
│ 原网站服务    │          │ Podman 容器 (8081) │
│               │          │ ├─ Nginx (Alpine)  │
└───────────────┘          │ └─ 静态文件         │
                           └────────────────────┘
```

## 🔄 更新流程

```bash
# 1. 本地重新构建
cd deployment
./build.sh
./save-image.sh

# 2. 上传新镜像
scp student-grouping-amd64.tar.gz root@121.40.124.135:/root/

# 3. 服务器更新
ssh root@121.40.124.135
podman stop student-grouping
podman rm student-grouping
podman rmi student-grouping:latest
gunzip -f student-grouping-amd64.tar.gz
podman load -i student-grouping-amd64.tar
podman run -d --name student-grouping -p 8081:80 --restart unless-stopped student-grouping:latest
```

## 📋 检查清单

### 部署前检查

- [ ] 域名 DNS 解析已配置 (group.adapt-learn.online → 121.40.124.135)
- [ ] 服务器安全组已开放 80, 443, 8081 端口
- [ ] 服务器已安装 Podman
- [ ] 服务器已安装 Nginx (用于反向代理)
- [ ] 本地已构建镜像 (`./build.sh`)
- [ ] 镜像已导出 (`./save-image.sh`)

### 部署后验证

- [ ] 容器运行正常 (`podman ps`)
- [ ] IP 访问正常 (http://121.40.124.135:8081)
- [ ] 域名解析正确 (`dig group.adapt-learn.online`)
- [ ] Nginx 配置正确 (`nginx -t`)
- [ ] SSL 证书有效 (https://group.adapt-learn.online)
- [ ] 功能测试通过 (上传/分组/导出)

## 🆘 问题排查

### 常见问题速查

| 问题 | 排查命令 | 解决方案文档 |
|------|----------|--------------|
| 容器无法启动 | `podman logs student-grouping` | DEPLOYMENT.md#故障排查 |
| 无法访问网站 | `ss -tlnp \| grep 8081` | DEPLOYMENT.md#故障排查 |
| SSL 证书失败 | `certbot certificates` | DEPLOYMENT.md#ssl证书问题 |
| 文件上传失败 | 检查 `client_max_body_size` | DEPLOYMENT.md#文件上传失败 |

---

**清单版本**: 1.0
**生成日期**: 2025-10-04
**适用系统**: Alibaba Cloud Linux 3.2104 LTS (AMD64)
