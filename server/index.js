const server = require("http").createServer();
const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000",
		methods: [ "GET", "POST" ]
  },
});

const users = {};
const socketToRoom = {};
const PORT = 4000;
const NEW_CHAT_MESSAGE_EVENT = "newChatMessage";

io.on("connection", (socket) => {
  socket.on("join room", roomID => {
    if (users[roomID]) {
        const length = users[roomID].length;
        if (length === 4) {
            socket.emit("room full");
            return;
        }
        users[roomID].push(socket.id);
    } else {
        users[roomID] = [socket.id];
    }
    socketToRoom[socket.id] = roomID;
    const usersInThisRoom = users[roomID].filter(id => id !== socket.id);

    socket.emit("all users", usersInThisRoom);
});

socket.on("sending signal", payload => {
    io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
});

socket.on("returning signal", payload => {
    io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
});

  socket.emit("me", socket.id)
  console.log(`Client ${socket.id} connected`);
  const { roomId } = socket.handshake.query;
  socket.join(roomId);
  socket.on(NEW_CHAT_MESSAGE_EVENT, (data) => {
    io.in(roomId).emit(NEW_CHAT_MESSAGE_EVENT, data);
  });
  

  socket.on("disconnect", () => {
    const roomID = socketToRoom[socket.id];
    let room = users[roomID];
    if (room) {
        room = room.filter(id => id !== socket.id);
        users[roomID] = room;
    }
    console.log(`Client ${socket.id} diconnected`);
    socket.leave(roomId);
    socket.broadcast.emit("callEnded")
  });
  socket.on("callUser", (data) => {
    io.to(data.userToCall).emit("callUser", { signal: data.signalData, from: data.from, name: data.name })
  })

  socket.on("answerCall", (data) => {
    io.to(data.to).emit("callAccepted", data.signal)
  })
});



server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
