// server side

const express= require('express')
const app= express()
app.use(express.static('public'))
const expressServer = app.listen(4000)

// const socketio = require('socket.io')

const {Server} = require ('socket.io')

const io = new Server (expressServer,{
     cors : [
        'http://localhost:4000'
     ]
})

io.on('connect',socket=>{
//     console.log(socket.handshake)

//     console.log(socket.id,"Hakunamatata")

//     socket.emit('welcome',[1,2,3]) // emit to this one socket

//     io.emit("Hello All", socket.id) // emit to all sockets connected to the server

//     socket.on('Thankyou', data=>{
//         console.log("Message from client",data)
//     })

//     socket.emit('HI there',"Do you want to die")

//     try{
//     const response = await.io.timeout(10000).emitWithAck("Some-event");
//     console.log(response)
// } catch(e){
//     console.log("some client didn't acknowledge the event in a given delay.")
// }

    socket.on("Message from Client to Server",newMessage=>{
        io.emit('Message from Server to Clients', newMessage);
    })
})

