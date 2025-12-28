const Base = 'http://localhost:3000'; 
const API = `${Base}/messages`;

// --- NEW: Handle Permanent User ID and Username ---
// If no ID exists in this browser, create a random one
if (!localStorage.getItem('chat_userId')) {
    localStorage.setItem('chat_userId', 'user_' + Math.random().toString(36).substr(2, 9));
}
const myId = localStorage.getItem('chat_userId');

const text = document.querySelector('.chat-input input');
const send = document.getElementById('send');
const chatMessages = document.querySelector('.chat-messages');
const usernameInput = document.getElementById('username');

// Load saved username if it exists
usernameInput.value = localStorage.getItem('chat_username') || "";

const socket = io('http://localhost:4000', {
    auth: { secret: "This is somethig confidential" }
});

// Function to render bubbles
function appendMessage(data) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');

    // COMPARE with myId instead of socket.id for history persistence
    if (data.userId === myId) {
        msgDiv.classList.add('sent');
    } else {
        msgDiv.classList.add('received');
    }

    msgDiv.innerHTML = `
        <div>${data.text}</div>
        <span class="user">${data.username}</span> <span class="time user">${data.time}</span>
    `;
    
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Listen for incoming messages
socket.on('Message from Server to Clients', (data) => {
    appendMessage(data);
});

// Send message logic
send.addEventListener('click', async (e) => {
    e.preventDefault();
    const newMessage = text.value.trim();
    if (!newMessage) return;

    // Save username for next time
    localStorage.setItem('chat_username', usernameInput.value.trim());

    const messageObj = {
        text: newMessage,
        userId: myId, // Use the permanent ID
        username: usernameInput.value.trim() || "Anonymous",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
        await axios.post(API, messageObj);
        socket.emit('Message from Client to Server', messageObj);
        text.value = '';
    } catch (err) {
        console.error("Failed to save:", err);
    }
});

// Load History
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await axios.get(API);
        res.data.forEach(appendMessage);
    } catch (error) {
        console.error('Error fetching history:', error);
    }
});