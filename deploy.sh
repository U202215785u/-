#!/bin/bash
set -e

# ═══════════════════════════════════════════════════════
# 咸鱼美术组 · 竞赛信息板 — 一键部署脚本
# 适用: Ubuntu 20.04/22.04 + 自建 PostgreSQL
# ═══════════════════════════════════════════════════════

RED='\033[31m' GREEN='\033[32m' YELLOW='\033[33m' NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── 配置 ──
DOMAIN=""                              # 域名，留空跳过 SSL
APP_DIR="/opt/competition-board"
DB_NAME="competition_board"
DB_USER="comp_admin"
DB_PASS=$(openssl rand -base64 16 2>/dev/null || head -c 16 /dev/urandom | base64)

if [ "$(id -u)" != "0" ]; then err "请用 root 执行: sudo bash deploy.sh"; fi

# ── 第一步：基础环境 ──
log "更新系统包..."
apt update -qq && apt install -y -qq curl git nginx certbot python3-certbot-nginx

# ── 第二步：安装 PostgreSQL ──
if ! command -v psql &>/dev/null; then
  log "安装 PostgreSQL..."
  apt install -y -qq postgresql postgresql-contrib
  systemctl enable postgresql
  systemctl start postgresql
fi

# 创建数据库和用户
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
  log "创建数据库用户和库..."
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
fi

# ── 第三步：Node.js 24 ──
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

# ── 第四步：克隆代码 ──
if [ -d "$APP_DIR/.git" ]; then
  log "更新代码..."
  cd "$APP_DIR"
  git pull origin master
else
  log "克隆仓库..."
  git clone https://github.com/U202215785u/-.git "$APP_DIR"
  cd "$APP_DIR"
fi

# ── 第五步：环境变量 ──
if [ ! -f .env.local ]; then
  log "生成 .env.local..."
  cat > .env.local << DOTENV
# 数据库（已自动创建）
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}

# AI 搜罗（需要你填写 DeepSeek API Key）
DEEPSEEK_API_KEY=sk-your-deepseek-key-here

# 管理后台鉴权
ADMIN_PASSWORD=$(openssl rand -base64 12 2>/dev/null || head -c 12 /dev/urandom | base64)
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)

# 部署域名
NEXT_PUBLIC_BASE_URL=${DOMAIN:-http://localhost:3000}
DOTENV

  warn "已生成 .env.local，请编辑填入 DEEPSEEK_API_KEY:"
  warn "  nano $APP_DIR/.env.local"
  warn "填好后重新运行: bash deploy.sh"
  log "数据库密码: $DB_PASS (已写入 .env.local)"
  log "管理后台密码: 见 .env.local 中的 ADMIN_PASSWORD"
  exit 0
fi

# ── 第六步：安装依赖 + 迁移 + 构建 ──
log "安装依赖（国内镜像加速）..."
npm config set registry https://registry.npmmirror.com
# 确保用 pg 而非 neon
npm install pg 2>/dev/null || true
npm uninstall @neondatabase/serverless 2>/dev/null || true
npm install

log "数据库迁移..."
npx drizzle-kit push

log "构建项目..."
NODE_ENV=production npx next build

# ── 第七步：PM2 ──
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
fi

pm2 delete competition-board 2>/dev/null || true
pm2 start npm --name "competition-board" -- start
pm2 save
pm2 startup systemd -u root --hp /root
log "PM2 已启动"

# ── 第八步：Nginx + SSL ──
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
  log "Nginx 已配置 $DOMAIN"

  log "申请 SSL..."
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m admin@"$DOMAIN" 2>/dev/null || warn "SSL 申请失败，稍后可手动执行: certbot --nginx -d $DOMAIN"
else
  warn "未设置 DOMAIN，跳过 HTTPS。直接访问: http://$(curl -s ifconfig.me):3000"
fi

log "部署完成！"
log "访问: ${DOMAIN:-http://$(curl -s ifconfig.me):3000}"
