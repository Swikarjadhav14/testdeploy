// server.js
require('dotenv').config()
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const roomParticipantsMap = {}; // Updated to store participants per room

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
  
    const participant = {
      id: socket.id,
      name: userName,
      roomId: roomId,
    };
  
    roomParticipantsMap[roomId].push(participant);
  
    console.log(`User ${userName} joined room ${roomId}`);
  
    // Sending participants to everyone in the room
    io.to(roomId).emit("participants", roomParticipantsMap[roomId]);
  
    // Sending participants to the joined user
    socket.emit("participants", roomParticipantsMap[roomId]);
  
    // Sending participants to others in the room
    socket.to(roomId).emit("updateParticipants", roomParticipantsMap[roomId]);
  });


  socket.on("textUpdate", (text) => {
    const roomId = Object.keys(socket.rooms).filter(item => item !== socket.id)[0]; // Get the room ID
    io.to(roomId).emit("textUpdate", { id: socket.id, text });
  });

  socket.on("disconnect", () => {
    const roomId = Object.keys(socket.rooms).filter(item => item !== socket.id)[0]; // Get the room ID

    if (roomId && roomParticipantsMap[roomId]) {
      roomParticipantsMap[roomId] = roomParticipantsMap[roomId].filter(
        (participant) => participant.id !== socket.id
      );
      io.to(roomId).emit("updateParticipants", roomParticipantsMap[roomId]);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
