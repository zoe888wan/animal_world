## 动物世界：Ubuntu 服务器一键部署（不影响已有 80/8080 服务）

目标：
- 后端（同时托管前端静态产物）监听 `3002`
- MySQL 使用本机已安装的 MySQL（你当前服务器已有 MySQL 8.x）
- 使用 `pm2` 守护进程，避免“终端一关就不可访问/重启就挂”
- 不修改 Nginx 的 80 配置、不触碰已有 Java 8080 服务

### 前置说明（你需要自己执行）
- 我无法直接登录你的 Vultr 服务器替你敲命令，但下面脚本可以做到“复制粘贴就跑完”。
- 默认安装 Node.js 20 LTS（满足 Node 18+ 要求）。

### 方案 A（推荐）：用 GitHub 拉代码
1. 把 `animal-world/` 推到你的 GitHub 仓库（私有/公开均可）。
2. 在服务器上：

```bash
git clone <你的仓库地址> ~/animal-world
cd ~/animal-world/deploy
bash install_node_pm2_and_open_port.sh
bash setup_mysql_db.sh
bash build_and_run_pm2.sh
```

部署完成后访问：
- `http://<服务器公网IP>:3002`

### 方案 B：不用 GitHub，直接上传代码
把整个 `animal-world/` 上传到服务器 `~/animal-world`，然后同样执行：

```bash
cd ~/animal-world/deploy
bash install_node_pm2_and_open_port.sh
bash setup_mysql_db.sh
bash build_and_run_pm2.sh
```

### 可配置项
脚本支持通过环境变量覆盖默认值：
- `APP_PORT`：默认 `3002`
- `DB_NAME`：默认 `animal_world`
- `DB_USER`：默认 `app`
- `DB_PASS`：默认 `app123`
- `MYSQL_ROOT_USER`：默认 `root`

示例（改端口/数据库账号）：

```bash
export APP_PORT=3002
export DB_NAME=animal_world
export DB_USER=app
export DB_PASS='StrongPasswordHere'
bash build_and_run_pm2.sh
```

### 诊断命令（只读）
```bash
pm2 status
pm2 logs animal-world --lines 200
curl -sS http://127.0.0.1:3002/api/health
sudo ss -lntp | grep -E ':3002'
```

