const { merge } = require("webpack-merge");
const path = require("path");
const common = require("./webpack.common.js");

const devHost = process.env.WEBPACK_DEV_HOST || "0.0.0.0";
const backendTarget = process.env.WEBPACK_BACKEND_URL || "http://localhost:3000";

module.exports = merge(common, {
  mode: "development",
  devtool: "eval-source-map",
  devServer: {
    watchFiles: ["./src/template.html"],
    host: devHost,
    port: 8080,
    allowedHosts: "all",
    client: {
      webSocketURL: "auto://0.0.0.0:0/ws",
    },
    static: [
      {
        directory: path.resolve(__dirname, "sounds"),
        publicPath: "/sounds",
      },
      {
        directory: path.resolve(__dirname, "src/assets"),
        publicPath: "/assets",
      },
    ],
    proxy: [
      {
        context: ["/socket.io", "/auth", "/health", "/social", "/friends"],
        target: backendTarget,
        ws: true,
      },
    ],
  },
});
