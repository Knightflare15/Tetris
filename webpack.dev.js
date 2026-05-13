const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");

module.exports = merge(common, {
  mode: "development",
  devtool: "eval-source-map",
  devServer: {
    watchFiles: ["./src/template.html"],
    port: 8080,
    proxy: [
      {
        context: ["/socket.io", "/auth", "/health"],
        target: "http://localhost:3000",
        ws: true,
      },
    ],
  },
});
