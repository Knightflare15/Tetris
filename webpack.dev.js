const { merge } = require("webpack-merge");
const path = require("path");
const common = require("./webpack.common.js");

module.exports = merge(common, {
  mode: "development",
  devtool: "eval-source-map",
  devServer: {
    watchFiles: ["./src/template.html"],
    port: 8080,
    static: [
      {
        directory: path.resolve(__dirname, "sounds"),
        publicPath: "/sounds",
      },
    ],
    proxy: [
      {
        context: ["/socket.io", "/auth", "/health"],
        target: "http://localhost:3000",
        ws: true,
      },
    ],
  },
});
