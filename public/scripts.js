const Base = 'http://localhost:3000';
const socket = io('http://localhost:4000');

socket.on('connect', () => console.log('Socket connected'));
socket.on('disconnect', () => console.log('Socket disconnected'));

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

let currentRoom = 'general';

if (!localStorage.getItem('chat_userId')) {
    localStorage.setItem('chat_userId', 'user_' + Math.random().toString(36).substr(2, 9));
}
const myId = localStorage.getItem('chat_userId');

const msgInput = document.getElementById('msg-input');
const chatMessages = document.getElementById('chat-messages');
const usernameInput = document.getElementById('username');
const channelList = document.getElementById('channel-list');

usernameInput.value = localStorage.getItem('chat_username') || "";

// --- CHANNEL LOGIC ---
async function loadChannels() {
    const res = await axios.get(`${Base}/channels`);
    channelList.innerHTML = '';
    res.data.forEach(renderChannelLink);
}

function renderChannelLink(channelObj) {
    if (document.getElementById(`ch-${channelObj.name}`)) return;
    const div = document.createElement('div');
    div.className = `channel-item ${channelObj.name === currentRoom ? 'active' : ''}`;
    div.id = `ch-${channelObj.name}`;
    div.innerText = `# ${channelObj.name}`;
    div.onclick = () => switchRoom(channelObj.name, div);
    channelList.appendChild(div);
}

window.switchRoom = (roomName, element) => {
    currentRoom = roomName;
    document.getElementById('current-room-title').innerText = `# ${roomName}`;
    document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
    
    // If element isn't provided (like when clicking a notification), find it by ID
    const target = element || document.getElementById(`ch-${roomName}`);
    if (target) target.classList.add('active');

    chatMessages.innerHTML = '';
    socket.emit('join room', roomName);
    loadHistory();
};

document.getElementById('create-channel-btn').addEventListener('click', async () => {
    const name = prompt("Channel name:").toLowerCase().replace(/\s+/g, '-');
    if (!name) return;
    try {
        const res = await axios.post(`${Base}/channels`, { name });
        socket.emit('New Channel Created', res.data);
    } catch (e) { alert("Error creating channel"); }
});

socket.on('Add Channel to UI', (channelObj) => renderChannelLink(channelObj));

// --- MESSAGE LOGIC ---
function renderMessage(data) {
    if (data.room !== currentRoom) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${data.userId === myId ? 'sent' : 'received'}`;
    msgDiv.innerHTML = `<div>${data.text}</div><span class="user-tag">${data.username} • ${data.time}</span>`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function loadHistory() {
    const res = await axios.get(`${Base}/messages?room=${currentRoom}`);
    chatMessages.innerHTML = '';
    res.data.forEach(renderMessage);
}

document.getElementById('send').addEventListener('click', async (e) => {
    e.preventDefault();
    const text = msgInput.value.trim();
    if (!text) return;

    const messageObj = {
        text, room: currentRoom, userId: myId,
        username: usernameInput.value || "Anonymous",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        socketId: socket.id
    };

    msgInput.value = '';
    localStorage.setItem('chat_username', messageObj.username);

    // Render own message immediately
    renderMessage(messageObj);

    await axios.post(`${Base}/messages`, messageObj);
    socket.emit('Message from Client to Server', messageObj);
});

// --- NOTIFICATION LOGIC ---
function showNotification(data) {
    console.log('showNotification called with:', data);
    if (data.socketId === socket.id) {
        console.log('Notification skipped: own socket message');
        return;
    }

    const container = document.getElementById('notification-container');
    if (!container) {
        console.error('Notification container not found');
        return;
    }
    console.log('Creating notification toast');

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
        console.log('Creating browser notification for:', data.username);
        try {
            const notification = new Notification(`New Message from ${data.username}`, {
                body: data.text.substring(0, 100) + (data.text.length > 100 ? '...' : ''),
                tag: `msg-${data.userId}-${Date.now()}`, // Prevent duplicates
            });
            console.log('Browser notification created successfully');
            notification.onclick = () => {
                window.focus();
                switchRoom(data.room);
                notification.close();
            };
        } catch (e) {
            console.error('Failed to create browser notification:', e);
        }
    } else {
        console.log('Notification permission not granted or not supported');
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    const roomInfo = data.room !== currentRoom ? ` in #${data.room}` : "";

    toast.innerHTML = `
        <div class="toast-header">New Message from ${data.username}${roomInfo}</div>
        <div class="toast-body">${data.text.substring(0, 50)}${data.text.length > 50 ? '...' : ''}</div>
    `;

    toast.onclick = () => {
        switchRoom(data.room);
        toast.remove();
    };

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// --- SINGLE COMBINED SOCKET LISTENER ---
socket.on('Message from Server to Clients', (data) => {
    console.log('Received message event:', data);
    renderMessage(data); // Render if in current room
    showNotification(data); // Notify if sender is someone else
});

// Start
window.addEventListener('DOMContentLoaded', () => {
    socket.emit('join room', currentRoom);
    loadChannels();
    loadHistory();
});