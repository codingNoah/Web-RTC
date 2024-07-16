const express = require("express");
const { Server } = require("socket.io");
const cors = require("cors");
const app = express();
app.use(cors());
// const httpServer = createServer(app);

app.get("/api", (req, res) => {
  return res.send("success");
});
const httpServer = app.listen(3003, () =>
  console.log("App running on port 3000")
);
const io = new Server(httpServer, {
  /* options */
  cors: {
    origin: "http://localhost:5500",
    origin: "http://127.0.0.1:5500",
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("Connection made...");

  socket.on("hey", (message) => {
    console.log(message);
  });
});
