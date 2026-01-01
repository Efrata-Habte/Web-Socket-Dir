const express = require('express');
const app = express();
const { Server } = require('socket.io');

app.use(express.static('public'));

const expressServer = app.listen(4000, () => console.log("Server on 4000"));

const io = new Server(expressServer, { cors: { origin: '*' } });

io.on('connection', (socket) => {
    // Room logic
    socket.on('join room', (roomName) => {
        socket.rooms.forEach(room => { if (room !== socket.id) socket.leave(room); });
        socket.join(roomName);
    });

    // Message logic (Room-specific)
    socket.on("Message from Client to Server", (data) => {
        io.to(data.room).emit('Message from Server to Clients', data);
    });

    // Channel logic (Global broadcast so everyone sees the new channel)
    socket.on('New Channel Created', (channelObj) => {
        io.emit('Add Channel to UI', channelObj);
    });
});