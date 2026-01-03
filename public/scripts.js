const BASE_URL = 'http://localhost:4000';
const socket = io(BASE_URL);

/* ---------------- STATE ---------------- */
let myId = localStorage.getItem('chat_userId') || 'user_' + Math.random().toString(36).slice(2, 9);
localStorage.setItem('chat_userId', myId);

let currentRoom = 'general';

/* ---------------- DOM ELEMENTS ---------------- */
const msgInput = document.getElementById('msg-input');
const chatMessages = document.getElementById('chat-messages');
const usernameInput = document.getElementById('username');
const channelList = document.getElementById('channel-list');
const notiBtn = document.getElementById('noti-btn');
const notiDropdown = document.getElementById('noti-dropdown');
const notiList = document.getElementById('noti-list');
const notiBadge = document.getElementById('noti-badge');
const sendBtn = document.getElementById('send');
const createChannelBtn = document.getElementById('create-channel-btn');

usernameInput.value = localStorage.getItem('chat_username') || '';

/* ---------------- NOTIFICATIONS ---------------- */

// 1. Fixed Toggle Logic
notiBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevents the document click listener from hiding it immediately
    notiDropdown.classList.toggle('hidden');
});

// Hide dropdown when clicking anywhere else
document.addEventListener('click', (e) => {
    if (!notiDropdown.contains(e.target) && !notiBtn.contains(e.target)) {
        notiDropdown.classList.add('hidden');
    }
});

async function updateNotificationsUI() {
    try {
        const res = await axios.get(`${BASE_URL}/notifications`);
        const filtered = res.data.filter(n => n.userId !== myId && n.room !== currentRoom);
        
        notiBadge.innerText = filtered.length;
        notiBadge.style.display = filtered.length > 0 ? 'block' : 'none';

        notiList.innerHTML = filtered.length === 0 ? '<div class="noti-item">No new messages</div>' : '';

        filtered.forEach(n => {
            const div = document.createElement('div');
            div.className = 'noti-item';
            div.innerHTML = `<strong>#${n.room}</strong><br>${n.username}: ${n.text.slice(0, 30)}...`;
            div.onclick = async (e) => {
                e.stopPropagation();
                await axios.delete(`${BASE_URL}/notifications/${n.id}`);
                switchRoom(n.room);
                notiDropdown.classList.add('hidden');
            };
            notiList.appendChild(div);
        });
    } catch (err) {
        console.error("Failed to update notifications:", err);
    }
}

/* ---------------- CHAT LOGIC ---------------- */

async function loadChannels() {
    try {
        const res = await axios.get(`${BASE_URL}/channels`);
        channelList.innerHTML = '';
        res.data.forEach(renderChannel);
    } catch (err) {
        console.error("Error loading channels:", err);
    }
}

function renderChannel(channel) {
    if (document.getElementById(`ch-${channel.name}`)) return;
    const div = document.createElement('div');
    div.id = `ch-${channel.name}`;
    div.className = `channel-item ${channel.name === currentRoom ? 'active' : ''}`;
    div.innerText = `# ${channel.name}`;
    
    // Using addEventListener is more reliable than .onclick
    div.addEventListener('click', () => switchRoom(channel.name));
    channelList.appendChild(div);
}

window.switchRoom = async (room) => {
    if (!room) return;
    currentRoom = room;
    
    // UI Updates
    document.getElementById('current-room-title').innerText = `# ${room}`;
    document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
    const active = document.getElementById(`ch-${room}`);
    if (active) active.classList.add('active');

    chatMessages.innerHTML = '<div class="loading">Loading messages...</div>';
    socket.emit('join room', room);
    
    try {
        // 1. Mark as read on server
        await axios.post(`${BASE_URL}/messages/read`, { room, userId: myId });
        
        // 2. Load History
        const res = await axios.get(`${BASE_URL}/messages?room=${room}`);
        chatMessages.innerHTML = '';
        res.data.forEach(renderMessage);
        
        // 3. Clear relevant notifications
        const notis = await axios.get(`${BASE_URL}/notifications`);
        const toDelete = notis.data.filter(n => n.room === room);
        for (let n of toDelete) {
            await axios.delete(`${BASE_URL}/notifications/${n.id}`);
        }
        
        updateNotificationsUI();
    } catch (err) {
        console.error("Room switch error:", err);
    }
};

function renderMessage(data) {
    if (data.room !== currentRoom) return;
    
    const isMine = data.userId === myId;
    const seenByOthers = data.seenBy && data.seenBy.length > 1;
    const checkmark = isMine ? `<span class="check-mark">${seenByOthers ? '✓✓' : '✓'}</span>` : '';

    const msg = document.createElement('div');
    msg.className = `message ${isMine ? 'sent' : 'received'}`;
    msg.innerHTML = `
        <div>${data.text}</div>
        <span class="user-tag">${data.username} • ${data.time} ${checkmark}</span>
    `;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/* ---------------- SENDING ---------------- */

const sendMessage = async () => {
    const text = msgInput.value.trim();
    if (!text) return;

    const message = {
        text,
        room: currentRoom,
        userId: myId,
        username: usernameInput.value || 'Anonymous',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    msgInput.value = '';
    localStorage.setItem('chat_username', message.username);

    // Optimistic UI (Show immediately)
    renderMessage({ ...message, seenBy: [myId] });

    try {
        await axios.post(`${BASE_URL}/messages`, message);
        socket.emit('Message from Client to Server', message);
    } catch (err) {
        console.error("Failed to send message:", err);
    }
};

sendBtn.addEventListener('click', sendMessage);

// Allow Enter key to send
msgInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

createChannelBtn.addEventListener('click', async () => {
    const name = prompt('New channel name:')?.toLowerCase().replace(/\s+/g, '-');
    if (!name) return;
    try {
        const res = await axios.post(`${BASE_URL}/channels`, { name });
        socket.emit('New Channel Created', res.data);
        renderChannel(res.data);
    } catch (err) {
        console.error("Error creating channel:", err);
    }
});

/* ---------------- SOCKET EVENTS ---------------- */

socket.on('Message from Server to Clients', (data) => {
    renderMessage(data);
    // Mark as read immediately if we are in the room
    axios.post(`${BASE_URL}/messages/read`, { room: currentRoom, userId: myId });
});

socket.on('Global Notification', (data) => {
    updateNotificationsUI();
});

socket.on('Messages Seen Update', async (data) => {
    if (data.room === currentRoom) {
        const res = await axios.get(`${BASE_URL}/messages?room=${currentRoom}`);
        chatMessages.innerHTML = '';
        res.data.forEach(renderMessage);
    }
});

socket.on('Add Channel to UI', (channel) => {
    renderChannel(channel);
});

/* ---------------- INIT ---------------- */

window.addEventListener('DOMContentLoaded', () => {
    loadChannels();
    switchRoom('general');
});