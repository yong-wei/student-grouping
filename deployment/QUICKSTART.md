# 快速部署指南

5分钟快速部署学生分组应用到阿里云服务器。

---

## 📦 准备工作

### 本地环境
- ✅ Docker 或 Podman 已安装
- ✅ 已下载项目源码

### 服务器信息
- **IP**: 121.40.124.135
- **域名**: group.adapt-learn.online
- **端口**: 8081

---

## 🚀 快速部署流程

### 步骤 1: 本地构建镜像

```bash
cd deployment
./build.sh
```

**预计时间**: 3-5 分钟

### 步骤 2: 导出镜像

```bash
./save-image.sh
```

生成: `student-grouping-amd64.tar.gz`

### 步骤 3: 上传到服务器

```bash
scp student-grouping-amd64.tar.gz root@121.40.124.135:/root/
scp docker-compose.yml root@121.40.124.135:/root/student-grouping/
```

### 步骤 4: 服务器导入并启动

SSH 登录服务器:
```bash
ssh root@121.40.124.135
```

导入镜像:
```bash
cd /root
gunzip student-grouping-amd64.tar.gz
podman load -i student-grouping-amd64.tar
```

启动容器:
```bash
cd student-grouping
podman run -d \
  --name student-grouping \
  -p 8081:80 \
  --restart unless-stopped \
  student-grouping:latest
```

验证:
```bash
podman ps
curl http://localhost:8081
```

---

## 🌐 配置域名访问（可选）

### 步骤 5: 配置 Nginx 反向代理

上传 Nginx 配置:
```bash
scp nginx-vhost/group.adapt-learn.online.conf \
  root@121.40.124.135:/etc/nginx/conf.d/
```

在服务器上:
```bash
# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx

# 开放防火墙端口
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 步骤 6: 配置 SSL 证书

上传并运行 SSL 配置脚本:
```bash
scp nginx-vhost/ssl-setup.sh root@121.40.124.135:/root/

# SSH 到服务器
ssh root@121.40.124.135

# 编辑脚本，修改邮箱
vim /root/ssl-setup.sh

# 运行脚本
sudo bash /root/ssl-setup.sh
```

---

## ✅ 验证部署

### 检查容器运行
```bash
podman ps
```

应显示 `student-grouping` 容器运行中。

### 测试访问

浏览器访问:
- http://121.40.124.135:8081 （直接 IP）
- https://group.adapt-learn.online （域名 + SSL）

### 功能测试
1. 上传 Excel 文件
2. 创建分组任务
3. 查看分组结果
4. 导出 PDF/Excel

---

## 🔧 常用命令

### 容器管理
```bash
podman ps                        # 查看运行状态
podman logs -f student-grouping  # 查看日志
podman restart student-grouping  # 重启容器
podman stop student-grouping     # 停止容器
```

### Nginx 管理
```bash
sudo systemctl reload nginx      # 重载配置
sudo nginx -t                    # 测试配置
sudo tail -f /var/log/nginx/error.log  # 查看错误日志
```

---

## 🆘 故障排查

### 容器无法启动
```bash
podman logs student-grouping
# 查看错误信息
```

### 无法访问网站
```bash
# 检查端口
ss -tlnp | grep 8081

# 检查防火墙
sudo firewall-cmd --list-all

# 检查 Nginx
sudo nginx -t
sudo systemctl status nginx
```

### DNS 解析问题
```bash
dig group.adapt-learn.online
# 应返回 121.40.124.135
```

---

## 📚 详细文档

详细部署指南请参考: [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 🔄 更新应用

```bash
# 本地重新构建
cd deployment
./build.sh
./save-image.sh

# 上传新镜像
scp student-grouping-amd64.tar.gz root@121.40.124.135:/root/

# 服务器更新
ssh root@121.40.124.135
podman stop student-grouping
podman rm student-grouping
gunzip -f student-grouping-amd64.tar.gz
podman load -i student-grouping-amd64.tar
podman run -d --name student-grouping -p 8081:80 --restart unless-stopped student-grouping:latest
```

---

**完成! 🎉** 您的应用已成功部署到阿里云。
