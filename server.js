/*
 Module dependencies:

 - Express
 - Http (to run Express)
 - Body parser (to parse JSON requests)
 - Underscore (because it's cool)
 - Socket.IO

 It is a common practice to name the variables after the module name.
 Ex: http is the "http" module, express is the "express" module, etc.
 The only exception is Underscore, where we use, conveniently, an
 underscore. Oh, and "socket.io" is simply called io. Seriously, the
 rest should be named after its module name.

 */
var express = require("express")
  , app = express()
  , http = require("http").createServer(app)
  , bodyParser = require("body-parser")
  , io = require("socket.io").listen(http)
  , _ = require("underscore");

/*
 The list of participants in our chatroom.
 The format of each participant will be:
 {
 id: "sessionId",
 name: "participantName",
 x: "xPosition",
 y: "yPosition"
 }
 */
var participants = [];

var cache = [];

/* Server config */

//Server's IP address
//app.set("ipaddr", "127.0.0.1");

//Server's port number listen to the port instead?
app.set("port", process.env.PORT || 8080);
//app.set("port", process.env.PORT || 3000);

//Specify the views folder
app.set("views", __dirname + "/views");

//View engine is Jade
app.set("view engine", "jade");

//Specify where the static content is
app.use(express.static("public", __dirname + "/public"));

//Tells server to support JSON requests
app.use(bodyParser.json());

/* Server routing */

//Handle route "GET /", as in "http://localhost:8080/"
app.get("/", function(request, response) {

  //Render the view called "index"
  response.render("index");

});

//POST method to create a chat message
app.post("/message", function(request, response) {

  //The request body expects a param named "message"
  var message = request.body.message;

  //If the message is empty or wasn't sent it's a bad request
  if(_.isUndefined(message) || _.isEmpty(message.trim())) {
    return response.json(400, {error: "Message is invalid"});
  }

  //We also expect the sender's name with the message
  var name = request.body.name;

  //We're grabbing the id too because we're shits
  var id = request.body.id;

  //expect position as well?
  var x = request.body.x;
  var y = request.body.y;

  // expect the timestamp
  var timestamp = request.body.timestamp;

  //Let our chatroom know there was a new message
  io.sockets.emit("incomingMessage", {timestamp: timestamp, message: message, id: id, x: x, y: y});

  // if more than 20 messages, pop oldest one from the back of the queue
  if ( cache.length >= 20 ) {
    cache.pop();
  }
  // push newest message to the front of the queue
  cache.unshift({timestamp: timestamp, message: message, id: id, x: x, y: y});

  //Looks good, let the client know
  response.json(200, {message: "we did the thing i guess message sent"});

});

/* Socket.IO events */
io.on("connection", function(socket){

  /*
   When a new user connects to our server, we expect an event called "newUser"
   and then we'll emit an event called "newConnection" with a list of all
   participants to all connected clients
   */
  socket.on("newUser", function(data) {
    participants.push({id: data.id, name: data.name, x: data.x, y: data.y});
    io.sockets.emit("newConnection", {participants: participants, cache: cache});
  });

  /*
   When a user changes his name, we are expecting an event called "nameChange"
   and then we'll emit an event called "nameChanged" to all participants with
   the id and new name of the user who emitted the original message
   */
  socket.on("nameChange", function(data) {
    _.findWhere(participants, {id: socket.id}).name = data.name;
    io.sockets.emit("nameChanged", {id: data.id, name: data.name});
  });

  socket.on("move", function(data) {
    _.findWhere(participants, {id: socket.id}).x = data.x;
    _.findWhere(participants, {id: socket.id}).y = data.y;
    io.sockets.emit("moved", {id: data.id, name: data.name, x: data.x, y: data.y})
  });

  /*
   When a client disconnects from the server, the event "disconnect" is automatically
   captured by the server. It will then emit an event called "userDisconnected" to
   all participants with the id of the client that disconnected
   */
  socket.on("disconnect", function() {
    participants = _.without(participants,_.findWhere(participants, {id: socket.id}));
    io.sockets.emit("userDisconnected", {id: socket.id, sender:"system"});
  });

});

//Start the http server at port and IP defined before/*
http.listen(app.get("port"));/*, app.get("ipaddr"), function() {
  console.log("Server up and running. Go to http://" + app.get("ipaddr") + ":" + app.get("port"));
});*/