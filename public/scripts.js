// client side
// console.log(io)

const socket=io('http://localhost:4000' , {
    auth : {
        secret : "This is somethig confidential"
    },
    query : {
        meaningOfLife : 42
    }
});

// socket.on('welcome', data=>{
//     console.log(data)

//     socket.emit('Thankyou','Thankyou dear')

//     socket.on('HI there',data=>{
//         console.log(data, "? Not really")})
// })

// socket.on("Hello All", data =>{
//     console.log("Message to all clients", data)
// })

// socket.on ("some-event", (callback)=>{
//     callback ('I get it');
// })

const text = document.querySelector('.chat-input input');
const send = document.getElementById('send');
const chatMessages = document.querySelector('.chat-messages');
const usernameInput = document.getElementById('username');

send.addEventListener('click', (e) => {
  e.preventDefault();

  const newMessage = text.value.trim();
  if (!newMessage) return;

  // Get username, default to "Anonymous" if empty
  const username = usernameInput.value.trim() || "Anonymous";

  // Send message object to server
  socket.emit('Message from Client to Server', {
    text: newMessage,
    senderId: socket.id,
    username: username,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  text.value = '';
});

socket.on('Message from Server to Clients', (data) => {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message');

  // Alignment
  if (data.senderId === socket.id) {
    msgDiv.classList.add('sent');      // right + blue
  } else {
    msgDiv.classList.add('received');  // left + gray
  }

  // Message content with username and time
  msgDiv.innerHTML = `
    <strong>${data.username}</strong> <span class="time">${data.time}</span>
    <div>${data.text}</div>
  `;

  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});
