var poops = 29;
var blobs = 7;

String.prototype.hashCode = function() {
  var hash = 0, i, chr, len;
  if (this.length === 0) return hash;
  for (i = 0, len = this.length; i < len; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
    hash = Math.abs(hash);
  }
  return hash;
};

function init() {

  /* set up audio shite */
  var channel_max = 10;                   // number of channels
  audiochannels = new Array();
  for (a=0;a<channel_max;a++) {                 // prepare the channels
    audiochannels[a] = new Array();
    audiochannels[a]['channel'] = new Audio();            // create a new audio object
    audiochannels[a]['finished'] = -1;              // expected end time for this channel
  }

  function play_multi_sound(s) {
    for (a=0;a<audiochannels.length;a++) {
      document.getElementById(s).play();
      thistime = new Date();
      if (audiochannels[a]['finished'] < thistime.getTime()) {      // is this channel finished?
        audiochannels[a]['finished'] = thistime.getTime() + document.getElementById(s).duration*1000;
        audiochannels[a]['channel'].src = document.getElementById(s).src;
        audiochannels[a]['channel'].load();
        audiochannels[a]['channel'].play();
        break;
      }
    }
    console.log("ping!");
  }

  /* add padding to number */
  function lpad(value, padding) {
    var zeroes = new Array(padding+1).join("0");
    return (zeroes + value).slice(-padding);
  }

  function recheckToolTips() {
    $('[data-toggle="tooltip"]')
  }

  /* all this other shite */

  var serverBaseUrl = document.domain;

  /*
   On client init, try to connect to the socket.IO server.
   Note we don't specify a port since we set up our server
   to run on port 8080
   */
  var socket = io.connect(serverBaseUrl);

  //We'll save our session ID in a variable for later
  var sessionId = '';

  //Helper function to update the participants' list
  function updateParticipants(participants) {
    $('#participants').html('');
    for (var i = 0; i < participants.length; i++) {

      $('#participants').append('<div id="' + participants[i].id + '" class="human' + (participants[i].id === sessionId ? ' me' : '') + '"><div id="user">'
        + participants[i].name + ' ' + (participants[i].id === sessionId ? '(you)' : '') 
        + '</div></div>');
      var blob = lpad((participants[i].id.hashCode() % blobs), 3);
      $('#' + participants[i].id).css({
        'left': participants[i].x + "px", 
        'top': participants[i].y + "px",
        'background': "url('../blobs/" + blob + ".gif')"
      });
    }

    $('#' + sessionId).draggable({
      stop: function() {
        sendMove();
      }
    });
  }

  /*
   When the client successfully connects to the server, an
   event "connect" is emitted. Let's get the session ID and
   log it. Also, let the socket.IO server there's a new user
   with a session ID and a name. We'll emit the "newUser" event
   for that.
   */
  socket.on('connect', function () {
    sessionId = socket.io.engine.id;
    console.log('Connected ' + sessionId);
    var x = Math.floor(Math.random()* ($( window ).innerWidth() - 250) );
    var y = (Math.floor(Math.random()* ($( window ).innerHeight() - 300))) + 100;
    console.log(y);
    socket.emit('newUser', {id: sessionId, name: $('#name').val(), x: x, y: y});
  });

  /*
   When the server emits the "newConnection" event, we'll reset
   the participants section and display the connected clients.
   Note we are assigning the sessionId as the span ID.
   */
  socket.on('newConnection', function (data) {
    updateParticipants(data.participants);
  });

  /*
   When the server emits the "userDisconnected" event, we'll
   remove the span element from the participants element
   */
  socket.on('userDisconnected', function(data) {
    $('#' + data.id).remove();
  });

  /*
   When the server fires the "nameChanged" event, it means we
   must update the span with the given ID accordingly
   */
  socket.on('nameChanged', function (data) {
    $('#' + data.id).children('#user').html(data.name + ' ' + (data.id === sessionId ? '(you)' : ''));
  });

  /*
   When receiving a new chat message with the "incomingMessage" event,
   we'll prepend it to the messages section
   */
  socket.on('incomingMessage', function (data) {
    console.log(data);
    var message = data.message;
    var name = data.name;
    var id = data.id;
    var x = data.x;
    var y = data.y;
    var timestamp = data.timestamp;
    $('#messages').append(
      '<a href="#" data-toggle="tooltip" data-message="'
      + data.message
      + '" id="'
      + timestamp.toString()
      + '"><div class="poop"'
      + 'id="'
      + timestamp.toString()
      + 'POOP"></div></a>');
    $('#' + timestamp + "POOP").css({
      'left': x + "px", 
      'top': y + "px",
      'background': "url('../poop/" + (lpad(timestamp % poops, 3)) + ".png')"
    });

    $('#' + timestamp).qtip({ 
      content: {
          attr: "data-message"// Tell qTip2 to look inside this attr for its content
      },
      position: {
          my: 'bottom center',  // Position my top left...
          at: 'top center', // at the bottom right of...
          target: $('#' + timestamp + "POOP") // my target
      },
      style: {
        classes: "qtip-light"
      }
    });
    play_multi_sound("ping");
  });

  /* 
    When recieving a new move with the "incomingMove" event,
    we'll move the div to the new location
  */
  socket.on('moved', function (data) {
    var id = data.id;
    var x = data.x;
    var y = data.y;
    if (data.id !== sessionId) {
      $("#" + id).animate({"left": x, "top": y});
      console.log("recieved move");
    } else {
      console.log("it's me who sent the move");
    }
  });

  /*
   Log an error if unable to connect to server
   */
  socket.on('error', function (reason) {
    console.log('Unable to connect to server', reason);
  });

  /*
   "sendMessage" will do a simple ajax POST call to our server with
   whatever message we have in our textarea
   */
  function sendMessage() {
    var outgoingMessage = $('#outgoingMessage').val();
    var name = $('#name').val();
    var id = sessionId;
    var position = $( "#" + id).position();
    var x = position.left - (Math.floor(Math.random()*50) + 50);
    var y = position.top + $( "#" + id).height() + (Math.floor(Math.random()*50)) - 50;
    var now = Date.now();
    console.log(JSON.stringify({message: outgoingMessage, timestamp: now, id: id, x: x, y: y}));
    $.ajax({
      url:  '/message',
      type: 'POST',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify({message: outgoingMessage, id: id, x: x, y: y, timestamp: now})
    });
  }

  /* 
    "sendMove" will do a simple ajax POST call to our server with whatever coordinate we have
  */
  function sendMove() {
    var id = sessionId;
    var loc = $("#" + id).position();
    var x = loc.left;
    var y = loc.top;
    socket.emit("move", {id: id, x: x, y: y});
    console.log("sent move");
  }

  /*
   If user presses Enter key on textarea, call sendMessage if there
   is something to share
   */
  function outgoingMessageKeyDown(event) {
    if (event.which == 13) {
      event.preventDefault();
      if ($('#outgoingMessage').val().trim().length <= 0) {
        return;
      }
      sendMessage();
      $('#outgoingMessage').val('');
    }
  }

  /*
   Helper function to disable/enable Send button
   */
  function outgoingMessageKeyUp() {
    var outgoingMessageValue = $('#outgoingMessage').val();
    $('#send').attr('disabled', (outgoingMessageValue.trim()).length > 0 ? false : true);
  }

  /*
   When a user updates his/her name, let the server know by
   emitting the "nameChange" event
   */
  function nameFocusOut() {
    var name = $('#name').val();
    socket.emit('nameChange', {id: sessionId, name: name});
  }

  /* Elements setup */
  $('#outgoingMessage').on('keydown', outgoingMessageKeyDown);
  $('#outgoingMessage').on('keyup', outgoingMessageKeyUp);
  $('#name').on('focusout', nameFocusOut);
  $('#send').on('click', sendMessage);

  $( document ).tooltip({
    tooltipClass: "tooltip"
  });

  $( document ).keydown(function(e) {
      var position = $( '#' + sessionId).position();
      switch(e.which) {
          case 37: // left
            if (position.x > 10) {
              console.log("old: " + position.x );
              $('#' + sessionId).css({
                'left': (position.x - 10) + "px"
              });
              console.log("new??: " + $( '#' + sessionId).position().x);
              sendMove();
            }
          break;
  
          case 38: // up
            if (position.y > 10) {
              $('#' + sessionId).css({
                'top': (position.y - 10) + "px"
              });
              sendMove();
            }
          break;
  
          case 39: // right
          console.log("old: " + position.x );
            $('#' + sessionId).css({
              'left': (position.x + 10) + "px"
            });
            console.log("new??: " + $( '#' + sessionId).position().x);
            sendMove();
          break;
  
          case 40: // down
            $('#' + sessionId).css({
              'top': (position.y + 10) + "px"
            });
            sendMove();
          break;
  
          default: return; // exit this handler for other keys
      }
      e.preventDefault(); // prevent the default action (scroll / move caret)
  });
}

$(document).on('ready', init);
