var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var index = require('./routes/index');
var users = require('./routes/users');
var fs = require('fs');
var path = require('path');

var spawn = require('child_process').spawn;
var proc;

var _serialPort = "/dev/cu.usbserial-A9007K9O";
var SerialPort = require("serialport").SerialPort;
var sp = new SerialPort(_serialPort, {
  parser: SerialPort.parsers.readline('\n')
});

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var ip = require("ip");


app.engine('html', require('ejs').renderFile);
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, '/public')));
app.use(express.static(path.join(__dirname, 'node_modules')));
app.use(express.static(path.join(__dirname, '/node_modules')));
app.use(express.static(path.join(__dirname, '/node_modules/jade-bootstrap')));
app.use('/', express.static(path.join(__dirname, 'stream')));

app.use('/', index);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
var sockets = {};
io.on('connection', function (socket) {
    sp.write('LC 1 0 1 IP:_'+ip.address());
    sp.on('data', function(data){
      console.log(data);
      socket.emit('output', data);
    });
    sp.on('open', function() {
      console.log('serial connected');
    });

    socket.on('command', function (data) {
        sp.write(data+"\r\n", function(err) {
          if( err ) {
            console.log(err);
          }
        });
    });
    sockets[socket.id] = socket;
    console.log("Total clients connected : ", Object.keys(sockets).length);
    /*
    socket.on('command', function(data) {
      socket.emit('output', "R " + data);
      console.log(data);
    });*/
    socket.on('disconnect', function() {
      delete sockets[socket.id];

      // no more sockets, kill the stream
      if (Object.keys(sockets).length == 0) {
        app.set('watchingFile', false);
        if (proc) proc.kill();
        fs.unwatchFile('./stream/image_stream.jpg');
      }
    });
    socket.on('start-stream', function() {
      startStreaming(io);
    });
});
function stopStreaming() {
  if (Object.keys(sockets).length === 0) {
    app.set('watchingFile', false);
    if (proc) proc.kill();
    fs.unwatchFile('./stream/image_stream.jpg');
  }
}

function startStreaming(io) {

  if (app.get('watchingFile')) {
    io.sockets.emit('liveStream', 'image_stream.jpg?_t=' + (Math.random() * 100000));
    return;
  }

  var args = ["-w", "640", "-h", "480", "-o", "./stream/image_stream.jpg", "-t", "999999999", "-tl", "100"];
  proc = spawn('raspistill', args);
  //raspistill

  console.log('Watching for changes...');

  app.set('watchingFile', true);

  fs.watchFile('./stream/image_stream.jpg', function(current, previous) {
    io.sockets.emit('liveStream', 'image_stream.jpg?_t=' + (Math.random() * 100000));
  });
}
module.exports = {app: app, server: server};
