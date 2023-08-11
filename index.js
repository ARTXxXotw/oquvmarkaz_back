const express = require("express")
const app = express()
const cors = require("cors")
const fileUpload = require("express-fileupload")
const bodyParser = require('body-parser');
const path = require('path'); 
const fs=require('fs')
const http = require("http");
const { Server } = require("socket.io");


const pool = require("./db")
const user=require('./routes/user.js')
const call_me=require('./routes/call_me.js')
const follow=require('./routes/follow.js')
const cours_types=require('./routes/cours_types.js')
const course=require('./routes/course.js')
const course_theme_task=require('./routes/course_theme_task.js')
const course_theme_comment=require('./routes/course_theme_comment')
const course_data_theme=require('./routes/course_data_theme')
const course_data_category=require('./routes/course_data_category')
const base_theme=require('./routes/base_theme')
const knowladge=require('./routes/knowladge')
const help=require('./routes/help')
const registerCourse=require('./routes/registerCourse')
const help_category=require('./routes/help_category')

// edu
const education=require('./lesson/education')
const schedule=require('./lesson/schedule')
const group_student=require('./lesson/group_student')
const attendance_lesson=require('./lesson/attendance_lesson')
const test=require('./lesson/test')
const attendance_test=require('./lesson/attendance_test')
const sertificat=require('./lesson/sertificat.js')


app.use(fileUpload())
app.use(cors())
app.use(express.static('./lesson/Images'))
app.use(express.static('./routes/Images'))

app.use(bodyParser.json());





app.get('/doc',(req,res)=>{
    const data = fs.readFileSync('./input2.htm',
    { encoding: 'utf8', flag: 'r' });
res.status(200).send(data)
})
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, '/input.html'));
});

 app.use("/api", registerCourse )
 app.use("/auth", user )
 app.use("/api" ,cours_types)
 app.use("/api" ,course)
 app.use("/api",course_theme_task)
 app.use("/api",course_data_category)
 app.use("/api",course_theme_comment)
 app.use("/api",course_data_theme)
 app.use("/api",base_theme)
 app.use("/api",knowladge)
 app.use("/api",help)
 app.use("/api",follow)
 app.use("/api",call_me)
 app.use("/api",help_category)



// api endu

app.use("/edu",education)
app.use("/edu",schedule)
app.use("/edu",group_student)
app.use("/edu",attendance_lesson)
app.use("/edu",test)
app.use("/edu",attendance_test)
app.use("/edu",sertificat)




const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});


 const usersSockets = {};

 io.on("connection", (socket) => {
   console.log(`User Connected: ${socket.id}`);
 
   // новый обработчик событий для аутентификации пользователя и сохранения его socket.id
   socket.on("authenticate", (data) => {
     usersSockets[data.email] = socket.id;
   });
 
   // новый обработчик событий для создания приватной комнаты с другим пользователем
   socket.on("create_private_room", async (data) => {
     const { email1, email2 } = data;
     // check if a private room between the two users already exists

    const user1Res = await pool.query(
      "SELECT rooms FROM users WHERE email = $1",
      [email1]
    );
   
    const user2Res = await pool.query(
      "SELECT rooms FROM users WHERE email = $1",
      [email2]
    );
    
      
     if (
       user1Res.rowCount === 0 ||
       user2Res.rowCount === 0 ||
       !user1Res.rows[0].rooms ||
       !user2Res.rows[0].rooms
     ) {
       return socket.emit("error", "One or both users do not exist");
     }
     const user1Rooms = user1Res.rows[0].rooms;
     console.log(user1Rooms,"user1Rooms");
     console.log(user1Res.rows[0],"user1Res.rows[0]");
     const user2Rooms = user2Res.rows[0].rooms;
     const commonRooms = user1Rooms.filter((room) => user2Rooms.includes(room));
     if (commonRooms.length > 0) {
       // a private room between the two users already exists
       return socket.emit("error", "A private room between the two users already exists");
     }
   
     // create a unique room name by concatenating both emails
     const roomName = `${email1}_${email2}`;
   
     // add the room to both users' rooms array
     await pool.query(
       "UPDATE users SET rooms = array_append(rooms, $1) WHERE email IN ($2, $3)",
       [roomName, email1, email2]
     );
   
     // join the room and send a success message
     socket.join(roomName);
     socket.emit("private_room_created", { roomName });
   
     // send a notification to the other user
     if (usersSockets[email2]) {
       io.to(usersSockets[email2]).emit("new_private_room", { roomName });
     }
   });
   
 
   socket.on("join_room", async (data) => {
     socket.join(data.room);
     console.log(`User with ID: ${socket.id} joined room: ${data.room}`);
   
     const res = await pool.query("SELECT * FROM messages WHERE room = $1", [
       data.room,
     ]);
     socket.emit("load_messages", res.rows);
   
     // check if the room is already in the user's rooms array
     const userRes = await pool.query(
       "SELECT rooms FROM users WHERE email = $1",
       [data.email]
     );
     const userRooms = userRes.rows[0].rooms;
     if (!userRooms.includes(data.room)) {
       // add the room to the user's rooms array if it's not already there
       await pool.query(
         "UPDATE users SET rooms = array_append(rooms, $1) WHERE email = $2",
         [data.room, data.email]
       );
     }
   });
   
 
   socket.on("send_message", async (data) => {
   console.log(data.image);
     await pool.query(
       "INSERT INTO messages (room, author, message, time) VALUES ($1, $2, $3, $4)",
       [data.room, data.author, data.message, data.time]
     );
     socket.to(data.room).emit("receive_message", data);
   });
 
   socket.on("get_users", async () => {
     const res = await pool.query("SELECT * FROM users");
     socket.emit("load_users", res.rows);
   });
   socket.on("get_rooms", async (data) => {
     const res = await pool.query(
       "SELECT rooms FROM users WHERE email = $1",
       [data.email]
     );
     socket.emit("load_rooms", res.rows[0].rooms);
   });
 
   socket.on("disconnect", () => {
     console.log("User Disconnected", socket.id);
 
     // удаляем socket.id пользователя из объекта usersSockets при отключении
     Object.keys(usersSockets).forEach((email) => {
       if (usersSockets[email] === socket.id) {
         delete usersSockets[email];
       }
     });
   });
 });

//  app.use("/message",socket)
server.listen(5000, () => {
    console.log("Localhost is Running");
})

