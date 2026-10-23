(function (global) {
  /**
   * 历史锁号数据库 API（SQLite 挂载在后端 server/data）。
   * GitHub Pages 静态页填你的 VPS/内网地址；留空则只用 result-cache + 本地 board。
   * 写入需配置 historyKey，与服务器环境变量 JCZQ_API_KEY 一致。
   */
  global.CC_CONFIG = global.CC_CONFIG || {
    historyApi: "",
    historyKey: "",
    historyDays: 10,
  };
})(window);
