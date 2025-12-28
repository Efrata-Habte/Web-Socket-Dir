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

send.addEventListener('click', (e) => {
  e.preventDefault();

  const newMessage = text.value.trim();
  if (!newMessage) return;

  socket.emit('Message from Client to Server', {
    text: newMessage,
    senderId: socket.id
  });

  text.value = '';
});

socket.on('Message from Server to Clients', (data) => {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message');

  if (data.senderId === socket.id) {
    msgDiv.classList.add('sent');      // right + blue
  } else {
    msgDiv.classList.add('received');  // left + gray
  }

  msgDiv.textContent = data.text;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});
