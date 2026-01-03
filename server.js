const express = require('express');
const app = express();
const { Server } = require('socket.io');
const fs = require('fs');

const DB_FILE = 'db.json';
const getDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const saveDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

app.use(express.json());
app.use(express.static('public'));

app.get('/channels', (req, res) => res.json(getDB().channels));

app.post('/channels', (req, res) => {
    const db = getDB();
    const channel = { id: Math.random().toString(36).substr(2, 9), name: req.body.name };
    db.channels.push(channel);
    saveDB(db);
    res.json(channel);
});

app.get('/messages', (req, res) => {
    const room = req.query.room;
    res.json(getDB().messages.filter(m => m.room === room));
});

app.post('/messages', (req, res) => {
    const db = getDB();
    const message = { 
        ...req.body, 
        id: Math.random().toString(36).substr(2, 9),
        seenBy: [req.body.userId] 
    };
    db.messages.push(message);
    db.notifications.push({ id: 'noti_' + Math.random().toString(36).substr(2, 9), ...message });
    saveDB(db);
    res.json(message);
});

// Mark messages as read
app.post('/messages/read', (req, res) => {
    const { room, userId } = req.body;
    const db = getDB();
    let changed = false;
    db.messages.forEach(m => {
        if (m.room === room && !m.seenBy.includes(userId)) {
            m.seenBy.push(userId);
            changed = true;
        }
    });
    if (changed) {
        saveDB(db);
        io.to(room).emit('Messages Seen Update', { room });
    }
    res.sendStatus(200);
});

app.get('/notifications', (req, res) => res.json(getDB().notifications));
app.delete('/notifications/:id', (req, res) => {
    const db = getDB();
    db.notifications = db.notifications.filter(n => n.id !== req.params.id);
    saveDB(db);
    res.sendStatus(200);
});

const expressServer = app.listen(4000, () => console.log("Server on 4000"));
const io = new Server(expressServer, { cors: { origin: '*' } });

io.on('connection', (socket) => {
    socket.on('join room', (roomName) => {
        socket.rooms.forEach(r => { if (r !== socket.id) socket.leave(r); });
        socket.join(roomName);
    });
    socket.on("Message from Client to Server", (data) => {
        socket.to(data.room).emit('Message from Server to Clients', data);
        socket.broadcast.emit('Global Notification', data);
    });
    socket.on('New Channel Created', (channelObj) => io.emit('Add Channel to UI', channelObj));
});