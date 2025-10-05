# 学生分组应用 - 阿里云部署文档

## 📋 目录

- [系统要求](#系统要求)
- [部署架构](#部署架构)
- [本地构建](#本地构建)
- [服务器部署](#服务器部署)
- [Nginx 反向代理配置](#nginx-反向代理配置)
- [SSL 证书配置](#ssl-证书配置)
- [验证部署](#验证部署)
- [故障排查](#故障排查)
- [维护与更新](#维护与更新)

---

## 系统要求

### 本地开发机（构建环境）
- macOS (ARM64) 或其他系统
- Docker 或 Podman
- Docker Compose 或 Podman Compose
- 至少 2GB 可用磁盘空间

### 阿里云服务器（运行环境）
- **操作系统**: Alibaba Cloud Linux 3.2104 LTS 64位
- **架构**: AMD64 (x86_64)
- **容器运行时**: Podman
- **Web 服务器**: Nginx (宿主机)
- **公网 IP**: 121.40.124.135
- **私网 IP**: 172.31.210.77
- **域名**: adapt-learn.online
- **子域名**: group.adapt-learn.online (本项目)

---

## 部署架构

```
互联网
  │
  ├─→ adapt-learn.online (80/443)
  │     └─→ 原有网站服务
  │
  ├─→ group.adapt-learn.online (80/443)
  │     └─→ Nginx 反向代理 (宿主机)
  │           └─→ http://127.0.0.1:8081
  │                 └─→ Podman 容器 (student-grouping)
  │                       └─→ Nginx (Alpine) → 静态文件
  │
  └─→ 121.40.124.135:8081 (直接访问)
        └─→ Podman 容器
```

### 端口分配
- **80**: Nginx 宿主机 (HTTP，重定向到 HTTPS)
- **443**: Nginx 宿主机 (HTTPS，SSL 终止)
- **8081**: Podman 容器映射端口 (容器内部 80 → 宿主机 8081)

---

## 本地构建

### 1. 进入部署目录

```bash
cd deployment
```

### 2. 构建 AMD64 镜像

```bash
./build.sh
```

这个脚本会:
- 检测 Docker 或 Podman
- 使用多阶段构建编译应用
- 生成 `student-grouping:latest` 镜像（AMD64 架构）

**预计时间**: 3-5 分钟

### 3. 本地测试（可选）

```bash
./deploy.sh
```

访问 http://localhost:8081 验证应用正常运行。

测试完成后停止:
```bash
./stop.sh
```

### 4. 导出镜像

```bash
./save-image.sh
```

生成文件: `student-grouping-amd64.tar.gz`

**文件大小**: 约 50-80 MB（已压缩）

---

## 服务器部署

### 方式 1: 上传镜像文件（推荐）

#### 1.1 上传镜像到服务器

```bash
# 在本地运行
scp student-grouping-amd64.tar.gz root@121.40.124.135:/root/
```

#### 1.2 上传部署文件

```bash
# 在本地运行
scp docker-compose.yml root@121.40.124.135:/root/student-grouping/
scp nginx/default.conf root@121.40.124.135:/root/student-grouping/nginx/
```

#### 1.3 在服务器上导入镜像

```bash
# SSH 登录服务器
ssh root@121.40.124.135

# 解压镜像文件
gunzip student-grouping-amd64.tar.gz

# 导入到 Podman
podman load -i student-grouping-amd64.tar

# 验证镜像
podman images | grep student-grouping
```

#### 1.4 启动容器

```bash
cd /root/student-grouping

# 使用 Podman 启动（不需要 Compose）
podman run -d \
  --name student-grouping \
  --platform linux/amd64 \
  -p 8081:80 \
  --restart unless-stopped \
  -e NODE_ENV=production \
  -e TZ=Asia/Shanghai \
  student-grouping:latest

# 或使用 Podman Compose
podman-compose up -d
```

#### 1.5 验证容器运行

```bash
# 查看容器状态
podman ps

# 查看日志
podman logs -f student-grouping

# 测试访问
curl http://localhost:8081
```

### 方式 2: 直接上传整个部署目录

```bash
# 在本地运行
cd /path/to/student-group
scp -r deployment/ root@121.40.124.135:/root/student-grouping/

# SSH 登录服务器
ssh root@121.40.124.135
cd /root/student-grouping

# 构建并启动
podman-compose build
podman-compose up -d
```

---

## Nginx 反向代理配置

### 1. 安装 Nginx（如果未安装）

```bash
# Alibaba Cloud Linux 3 使用 dnf
sudo dnf install -y nginx

# 启动并设置开机自启
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2. 复制虚拟主机配置

```bash
# 上传配置文件到服务器
scp nginx-vhost/group.adapt-learn.online.conf \
  root@121.40.124.135:/etc/nginx/sites-available/

# 在服务器上创建软链接
sudo mkdir -p /etc/nginx/sites-enabled
sudo ln -sf \
  /etc/nginx/sites-available/group.adapt-learn.online.conf \
  /etc/nginx/sites-enabled/

# 或者直接添加到 nginx.conf
sudo cp nginx-vhost/group.adapt-learn.online.conf \
  /etc/nginx/conf.d/group.adapt-learn.online.conf
```

### 3. 修改 Nginx 主配置

编辑 `/etc/nginx/nginx.conf`，在 `http {}` 块中添加:

```nginx
# 包含所有虚拟主机配置
include /etc/nginx/sites-enabled/*;
# 或
include /etc/nginx/conf.d/*.conf;
```

### 4. 测试配置

```bash
# 测试 Nginx 配置语法
sudo nginx -t

# 如果测试通过，重载配置
sudo systemctl reload nginx
```

### 5. 配置防火墙

```bash
# 开放 HTTP 和 HTTPS 端口
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# 开放容器端口 8081（可选，用于直接IP访问）
sudo firewall-cmd --permanent --add-port=8081/tcp

# 重载防火墙
sudo firewall-cmd --reload

# 查看当前规则
sudo firewall-cmd --list-all
```

---

## SSL 证书配置

### 方式 1: 使用自动化脚本（推荐）

```bash
# 上传 SSL 配置脚本
scp nginx-vhost/ssl-setup.sh root@121.40.124.135:/root/

# SSH 登录服务器
ssh root@121.40.124.135

# 编辑脚本，修改邮箱地址
vim /root/ssl-setup.sh
# 将 EMAIL="your-email@example.com" 改为您的真实邮箱

# 运行脚本
sudo bash /root/ssl-setup.sh
```

### 方式 2: 手动配置 Certbot

#### 2.1 安装 Certbot

```bash
# Alibaba Cloud Linux 3
sudo dnf install -y certbot python3-certbot-nginx
```

#### 2.2 获取证书

```bash
# 确保 DNS 解析已生效
dig group.adapt-learn.online

# 使用 Certbot 自动配置
sudo certbot --nginx -d group.adapt-learn.online

# 或者手动方式（webroot）
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d group.adapt-learn.online \
  --email your-email@example.com \
  --agree-tos
```

#### 2.3 证书自动续期

Certbot 会自动设置续期任务（systemd timer）。

手动测试续期:
```bash
sudo certbot renew --dry-run
```

---

## 验证部署

### 1. 检查容器状态

```bash
podman ps
# 应显示 student-grouping 容器运行中

podman logs student-grouping
# 应无错误日志
```

### 2. 检查端口监听

```bash
ss -tlnp | grep 8081
# 应显示 8081 端口已监听
```

### 3. 测试本地访问

```bash
# 服务器上测试
curl http://localhost:8081
# 应返回 HTML 内容

curl http://127.0.0.1:8081
# 应返回 HTML 内容
```

### 4. 测试公网访问

在浏览器中访问:
- ✅ http://121.40.124.135:8081 （直接IP访问）
- ✅ http://group.adapt-learn.online （HTTP，会重定向到 HTTPS）
- ✅ https://group.adapt-learn.online （HTTPS，推荐）

### 5. 功能验证

- ✅ 上传 Excel 文件
- ✅ 创建分组任务
- ✅ 查看分组结果
- ✅ 导出 PDF/Excel/ZIP

### 6. 性能测试

```bash
# 使用 ab 测试
ab -n 100 -c 10 http://localhost:8081/

# 查看容器资源使用
podman stats student-grouping
```

---

## 故障排查

### 容器无法启动

```bash
# 查看详细日志
podman logs student-grouping

# 检查镜像是否存在
podman images

# 检查端口是否被占用
ss -tlnp | grep 8081

# 手动启动容器查看错误
podman run --rm -it student-grouping:latest /bin/sh
```

### 无法访问网站

#### 1. 检查容器运行状态
```bash
podman ps -a
# 如果容器退出，查看日志
podman logs student-grouping
```

#### 2. 检查防火墙
```bash
sudo firewall-cmd --list-all
# 确保 80, 443, 8081 端口已开放
```

#### 3. 检查 Nginx 配置
```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

#### 4. 检查 DNS 解析
```bash
dig group.adapt-learn.online
# 应返回 121.40.124.135
```

#### 5. 检查安全组（阿里云控制台）
- 确保安全组规则允许 80, 443, 8081 端口入站

### SSL 证书问题

```bash
# 检查证书是否存在
sudo ls -la /etc/letsencrypt/live/group.adapt-learn.online/

# 测试证书有效性
sudo certbot certificates

# 手动续期
sudo certbot renew

# 查看 Certbot 日志
sudo journalctl -u certbot
```

### 文件上传失败

检查 Nginx 配置中的 `client_max_body_size`:

```bash
# 容器内 Nginx 配置
podman exec student-grouping cat /etc/nginx/conf.d/default.conf
# 应包含: client_max_body_size 50m;

# 宿主机 Nginx 配置
sudo grep -r "client_max_body_size" /etc/nginx/
```

---

## 维护与更新

### 更新应用版本

#### 1. 本地重新构建

```bash
cd deployment
./build.sh
./save-image.sh
```

#### 2. 上传新镜像

```bash
scp student-grouping-amd64.tar.gz root@121.40.124.135:/root/
```

#### 3. 服务器更新

```bash
# SSH 登录服务器
ssh root@121.40.124.135

# 停止旧容器
podman stop student-grouping
podman rm student-grouping

# 删除旧镜像
podman rmi student-grouping:latest

# 导入新镜像
gunzip -f student-grouping-amd64.tar.gz
podman load -i student-grouping-amd64.tar

# 启动新容器
cd /root/student-grouping
podman-compose up -d

# 验证
podman ps
podman logs -f student-grouping
```

### 备份与恢复

#### 备份镜像

```bash
podman save student-grouping:latest | gzip > backup-$(date +%Y%m%d).tar.gz
```

#### 备份配置

```bash
tar -czf nginx-config-backup.tar.gz \
  /etc/nginx/sites-available/group.adapt-learn.online.conf \
  /root/student-grouping/docker-compose.yml
```

### 查看日志

```bash
# 容器日志
podman logs -f student-grouping

# Nginx 访问日志
sudo tail -f /var/log/nginx/group.adapt-learn.online.access.log

# Nginx 错误日志
sudo tail -f /var/log/nginx/group.adapt-learn.online.error.log
```

### 监控资源使用

```bash
# 实时监控
podman stats student-grouping

# 查看磁盘使用
podman system df

# 清理未使用的镜像和容器
podman system prune -a
```

---

## 安全建议

1. **定期更新系统**
   ```bash
   sudo dnf update -y
   ```

2. **配置 fail2ban 防止暴力破解**
   ```bash
   sudo dnf install -y fail2ban
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban
   ```

3. **限制 SSH 访问**
   - 使用密钥认证
   - 禁用 root 密码登录
   - 更改默认 SSH 端口

4. **定期备份**
   - 镜像备份（每次更新）
   - 配置文件备份（每次修改）
   - SSL 证书备份（定期）

5. **监控日志**
   - 定期检查 Nginx 错误日志
   - 定期检查容器日志
   - 设置日志告警

---

## 技术支持

如遇到问题，请提供以下信息:

```bash
# 系统信息
uname -a
cat /etc/os-release

# 容器信息
podman --version
podman ps -a
podman logs student-grouping

# Nginx 信息
nginx -v
sudo nginx -t
sudo systemctl status nginx

# 网络信息
ss -tlnp
sudo firewall-cmd --list-all
```

---

## 附录

### 常用命令速查

```bash
# 容器管理
podman ps                        # 查看运行中的容器
podman ps -a                     # 查看所有容器
podman logs -f student-grouping  # 查看日志
podman stop student-grouping     # 停止容器
podman start student-grouping    # 启动容器
podman restart student-grouping  # 重启容器
podman rm student-grouping       # 删除容器

# Nginx 管理
sudo systemctl status nginx      # 查看状态
sudo systemctl reload nginx      # 重载配置
sudo systemctl restart nginx     # 重启服务
sudo nginx -t                    # 测试配置

# SSL 证书管理
sudo certbot certificates        # 查看证书
sudo certbot renew              # 手动续期
sudo systemctl status certbot.timer  # 查看自动续期任务

# 防火墙管理
sudo firewall-cmd --list-all     # 查看规则
sudo firewall-cmd --reload       # 重载规则
```

---

**文档版本**: 1.0
**最后更新**: 2025-10-04
**维护者**: Claude Code
