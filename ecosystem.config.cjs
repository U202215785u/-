// PM2 进程管理配置
module.exports = {
  apps: [
    {
      name: "competition-board",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/opt/competition-board",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      max_memory_restart: "512M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
