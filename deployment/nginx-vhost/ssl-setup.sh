#!/bin/bash
# 自动配置 SSL 证书（使用 Certbot）
# 在阿里云服务器上运行此脚本

set -e

DOMAIN="group.adapt-learn.online"
EMAIL="your-email@example.com"  # 请修改为您的邮箱

echo "🔐 配置 SSL 证书 for $DOMAIN"
echo ""

# 检查是否为 root
if [ "$EUID" -ne 0 ]; then
    echo "❌ 请使用 root 权限运行此脚本"
    echo "   sudo bash ssl-setup.sh"
    exit 1
fi

# 检查 Certbot 是否已安装
if ! command -v certbot &> /dev/null; then
    echo "📦 安装 Certbot..."

    # Alibaba Cloud Linux 3 基于 RHEL/CentOS
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [[ "$ID" == "alinux" ]] || [[ "$ID" == "centos" ]] || [[ "$ID" == "rhel" ]]; then
            dnf install -y certbot python3-certbot-nginx
        elif [[ "$ID" == "ubuntu" ]] || [[ "$ID" == "debian" ]]; then
            apt-get update
            apt-get install -y certbot python3-certbot-nginx
        fi
    fi
fi

echo "✅ Certbot 已安装"
echo ""

# 创建 webroot 目录
mkdir -p /var/www/certbot

echo "📝 获取 SSL 证书..."
echo "   域名: $DOMAIN"
echo "   邮箱: $EMAIL"
echo ""

# 获取证书（webroot 方式）
certbot certonly --webroot \
    -w /var/www/certbot \
    -d $DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --non-interactive

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SSL 证书获取成功!"
    echo ""
    echo "📁 证书位置:"
    echo "   fullchain: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    echo "   privkey:   /etc/letsencrypt/live/$DOMAIN/privkey.pem"
    echo ""
    echo "🔄 重载 Nginx..."
    systemctl reload nginx
    echo ""
    echo "✅ 配置完成!"
    echo ""
    echo "🌐 访问地址: https://$DOMAIN"
    echo ""
    echo "📅 证书自动续期:"
    echo "   Certbot 会自动续期证书（通过 systemd timer）"
    echo "   手动续期: certbot renew"
else
    echo ""
    echo "❌ SSL 证书获取失败"
    echo ""
    echo "💡 故障排查:"
    echo "   1. 检查域名 DNS 解析是否正确"
    echo "      dig $DOMAIN"
    echo "   2. 检查防火墙是否开放 80/443 端口"
    echo "      firewall-cmd --list-all"
    echo "   3. 检查 Nginx 配置是否正确"
    echo "      nginx -t"
    echo "   4. 查看 Certbot 详细日志"
    echo "      journalctl -u certbot"
    exit 1
fi
