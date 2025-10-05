# 学生分组应用 - 阿里云部署包

本目录包含将学生分组应用部署到阿里云服务器所需的所有文件。

## 📁 目录结构

```
deployment/
├── student-grouping-amd64.tar.gz   # Docker 镜像文件 (35 MB)
├── nginx-vhost/                    # 服务器 Nginx 配置
│   ├── group.adapt-learn.online.conf  # 虚拟主机配置
│   └── ssl-setup.sh                   # SSL 自动配置脚本
├── README.md                       # 本文件
├── QUICKSTART.md                   # 快速部署指南
├── DEPLOYMENT.md                   # 完整部署文档
├── CHECKLIST.md                    # 部署清单与架构
└── 部署总结.md                      # 中文部署总结
```

## 🚀 快速部署

### 步骤 1: 上传镜像到服务器

```bash
scp student-grouping-amd64.tar.gz root@121.40.124.135:/root/
```

### 步骤 2: SSH 登录服务器并导入镜像

```bash
ssh root@121.40.124.135

# 解压镜像
gunzip student-grouping-amd64.tar.gz

# 导入到 Podman
podman load -i student-grouping-amd64.tar

# 验证镜像
podman images | grep student-grouping
```

### 步骤 3: 启动容器

```bash
podman run -d \
  --name student-grouping \
  -p 8081:80 \
  --restart unless-stopped \
  student-grouping:latest

# 验证运行
podman ps
curl http://localhost:8081
```

## 🌐 访问地址

部署成功后可通过以下方式访问:

- **直接 IP 访问**: http://121.40.124.135:8081 (立即可用)
- **子域名访问**: https://group.adapt-learn.online (需配置反向代理)

## 🔧 配置反向代理 (可选)

### 1. 上传 Nginx 配置

```bash
scp nginx-vhost/group.adapt-learn.online.conf \
  root@121.40.124.135:/etc/nginx/conf.d/
```

### 2. 在服务器上配置

```bash
# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx

# 开放防火墙端口
sudo firewall-cmd --permanent --add-service={http,https}
sudo firewall-cmd --reload
```

### 3. 配置 SSL 证书

```bash
# 上传 SSL 配置脚本
scp nginx-vhost/ssl-setup.sh root@121.40.124.135:/root/

# SSH 到服务器
ssh root@121.40.124.135

# 编辑脚本修改邮箱,然后运行
vim /root/ssl-setup.sh
sudo bash /root/ssl-setup.sh
```

## 📚 详细文档

| 文档 | 用途 |
|------|------|
| [QUICKSTART.md](QUICKSTART.md) | 5分钟快速部署指南 |
| [DEPLOYMENT.md](DEPLOYMENT.md) | 完整部署文档 (包含故障排查) |
| [CHECKLIST.md](CHECKLIST.md) | 部署清单与架构说明 |
| [部署总结.md](部署总结.md) | 中文部署总结与验证清单 |

## 📊 技术信息

### 镜像信息
- **名称**: `student-grouping:latest`
- **大小**: 37 MB (未压缩), 35 MB (压缩)
- **架构**: linux/amd64
- **基础镜像**: nginx:1.27-alpine
- **构建方式**: 多阶段构建 (Node.js 20.18.1 + Nginx Alpine)

### 服务器要求
- **操作系统**: Alibaba Cloud Linux 3.2104 LTS
- **架构**: AMD64 (x86_64)
- **容器运行时**: Podman
- **Web 服务器**: Nginx (反向代理)
- **公网 IP**: 121.40.124.135
- **域名**: group.adapt-learn.online

## 🔄 更新应用

如需更新应用版本:

1. 重新构建镜像 (在源码目录)
2. 导出新镜像
3. 上传到服务器
4. 停止并删除旧容器
5. 导入新镜像并启动

详细步骤参见 [DEPLOYMENT.md#维护与更新](DEPLOYMENT.md#维护与更新)

## 🆘 故障排查

常见问题:
- 容器无法启动 → 查看日志: `podman logs student-grouping`
- 无法访问 → 检查端口: `ss -tlnp | grep 8081`
- 防火墙问题 → `sudo firewall-cmd --list-all`

详细故障排查指南参见 [DEPLOYMENT.md#故障排查](DEPLOYMENT.md#故障排查)

## ✅ 部署验证清单

- [ ] 镜像文件已上传到服务器
- [ ] 镜像已成功导入到 Podman
- [ ] 容器已启动并运行正常
- [ ] IP 访问正常 (http://121.40.124.135:8081)
- [ ] Nginx 反向代理已配置 (可选)
- [ ] SSL 证书已配置 (可选)
- [ ] 域名访问正常 (https://group.adapt-learn.online)
- [ ] 应用功能测试通过

---

**部署包版本**: 1.0
**镜像构建日期**: 2025-10-04
**目标服务器**: 121.40.124.135 (group.adapt-learn.online)

🎉 **准备就绪,可以开始部署!**
