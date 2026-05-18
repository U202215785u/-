#!/bin/bash
set -e

# ═══════════════════════════════════════════════════════
# 咸鱼美术组 · 竞赛信息板 — 一键部署脚本
# 适用: Ubuntu 22.04 / Debian 12
# ═══════════════════════════════════════════════════════

RED='\033[31m' GREEN='\033[32m' YELLOW='\033[33m' NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── 配置（按你的实际情况改这三行） ──
DOMAIN=""                    # 你的域名，如 board.example.com。留空则跳过 SSL
GIT_REPO="https://github.com/你的用户名/咸鱼美术组.git"  # 替换为你的 Git 仓库地址
APP_DIR="/opt/competition-board"

# ── 检测系统 ──
if [ "$(id -u)" != "0" ]; then err "请用 root 执行: sudo bash deploy.sh"; fi

# ── 第一步：基础环境 ──
log "更新系统包..."
apt update -qq && apt install -y -qq curl git nginx certbot python3-certbot-nginx

# ── 第二步：安装 Node.js 24 ──
if ! command -v fnm &>/dev/null; then
  log "安装 fnm..."
  curl -fsSL https://fnm.vercel.app/install | bash
  export FNM_DIR="/root/.local/share/fnm"
  [ -s "$FNM_DIR/fnm" ] && eval "$(fnm env)"
fi

export FNM_DIR="/root/.local/share/fnm"
[ -s "$FNM_DIR/fnm" ] && eval "$($FNM_DIR/fnm env)"

fnm install 24
fnm use 24
log "Node.js $(node -v) / npm $(npm -v)"

# ── 第三步：克隆/更新代码 ──
if [ -d "$APP_DIR" ]; then
  log "更新代码..."
  cd "$APP_DIR"
  git pull origin main
else
  log "克隆仓库..."
  git clone "$GIT_REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

# ── 第四步：环境变量 ──
if [ ! -f .env.local ]; then
  warn "未找到 .env.local，从 .env.example 创建模板..."
  cp .env.example .env.local
  warn "请编辑 $APP_DIR/.env.local 填入真实配置后重新运行本脚本！"
  warn "  nano $APP_DIR/.env.local"
  exit 0
fi

# ── 第五步：安装依赖 + 构建 ──
log "安装依赖（使用国内镜像）..."
npm config set registry https://registry.npmmirror.com
npm install

log "数据库迁移..."
npx drizzle-kit push

log "构建项目..."
npx next build

# ── 第六步：PM2 进程守护 ──
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
fi

pm2 delete competition-board 2>/dev/null || true
pm2 start npm --name "competition-board" -- start
pm2 save
pm2 startup systemd -u root --hp /root
log "PM2 已启动"

# ── 第七步：Nginx ──
if [ -n "$DOMAIN" ]; then
  cat > /etc/nginx/sites-available/competition-board << NGINX
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

  ln -sf /etc/nginx/sites-available/competition-board /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && nginx -s reload
  log "Nginx 已配置"DOMAIN

  # ── 第八步：SSL 证书 ──
  log "申请 SSL 证书..."
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m admin@"$DOMAIN" || warn "SSL 申请失败，可稍后手动执行: certbot --nginx -d $DOMAIN"
else
  warn "未设置 DOMAIN，跳过 Nginx 和 SSL 配置"
fi

# ═══════════════════════════════════════════════════════
log "部署完成！"
log "访问地址: ${DOMAIN:-http://$(curl -s ifconfig.me):3000}"
