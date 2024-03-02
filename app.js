// server.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const participants = {};
const roomSocketMap = {};
const roomParticipantsMap = {};

app.use(express.static(path.join(__dirname, "client")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "index.html"));
});

app.get("/:roomId", (req, res) => {
  const roomId = req.params.roomId;
  res.sendFile(path.join(__dirname, "client", "editorPage.html"));
});

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("joinRoom", (roomId, userName) => {
    socket.join(roomId);

    if (!roomParticipantsMap[roomId]) {
      roomParticipantsMap[roomId] = [];
    }
    roomParticipantsMap[roomId].push({
      id: socket.id,
      name: userName,
    });

    io.to(roomId).emit("updateParticipants", roomParticipantsMap[roomId]);

    roomSocketMap[socket.id] = roomId;

    participants[socket.id] = {
      id: socket.id,
      name: userName,
      roomId: roomId,
    };

    io.emit("participants", roomParticipantsMap[roomId]);
  });

  socket.on("textUpdate", (text) => {
    const roomId = roomSocketMap[socket.id];
    io.to(roomId).emit("textUpdate", { id: socket.id, text });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");

    const roomId = roomSocketMap[socket.id];

    if (roomId && roomParticipantsMap[roomId]) {
      roomParticipantsMap[roomId] = roomParticipantsMap[roomId].filter(
        (participant) => participant.id !== socket.id
      );
      io.to(roomId).emit("updateParticipants", roomParticipantsMap[roomId]);
    }

    delete participants[socket.id];
    io.emit("participants", Object.values(participants));

    delete roomSocketMap[socket.id];
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
