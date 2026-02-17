const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(
  cors({
    origin: "https://suffragium-frontend.vercel.app",
    credentials: true,
  }),
);
app.use(express.json());
app.set("trust proxy", true);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://suffragium-frontend.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const pollRoute = require("./Routes/pollRoute");

app.set("io", io);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinPoll", (pollId) => {
    socket.join(pollId);
    console.log("joined poll Room", pollId);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("DB connected"))
  .catch((err) => console.log(err));

app.use("/api/polls", pollRoute);

const PORT = process.env.PORT;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
