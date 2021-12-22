// Imported libraries.
const express = require('express'),
path = require("path"),
session = require('express-session'),
compression = require('compression'),
http = require('http'),
fs = require('fs'),
VAD = require("./vad.js"),
wav = require('wav'),
speech = require('./speech');

// Create the app in express.
app = express();
app.use(express.urlencoded({
    extended: true
}));
app.use(express.json());
// Compress static files.
app.use(compression());
// Serve public static files.
app.use(express.static(path.join(__dirname, "public")));
// Use ejs for rendering the page.
app.set("view engine", "ejs");
// Session to distinguish different users.
var sessionMiddleware = session({
    secret: `randomSecret`,
    name: 'voice',
    resave: true,
    saveUninitialized: true,
    cookie : {
        httpOnly: true,
        sameSite: 'Lax',
        maxAge: 9999999000,
        signed: true
    }
});
app.use(sessionMiddleware);

// Send home page
app.get(`/`, async function(request, response) {
    response.render('index')
})

// HTTP server for Socket IO
server = http.createServer(app)
const io = require("socket.io")(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
});

// Endpoint for Socket IO voice communication
io.of("/socket").use(function(socket, next) {
    sessionMiddleware(socket.request, socket.request.res || {}, next);
});
// Handling communications
io.of("/socket").on('connection', client => {
    console.log("conneting")
    var del
    const id = client.request.session.id;
    const vad = new VAD(VAD.Mode.NORMAL);
    client.on('start', async function() {
      try {
          client.audio_write = new wav.FileWriter(`./audio_files/${client.request.session.id}.wav`, {
            channels: 1,
            sampleRate: 16000,
            bitDepth: 16
          }
          );
          client.silent_counter = 0
          client.voice_counter = 0
          client.audio_total = 0
          client.time1 = new Date()
          client.times = [13000,7000,2500]
          client.text_result = ""
      } catch (err) {
        client.send("")
        throw new Error(err.message)
      }
    });
  
    client.on('end', async function() {
        await sleep(600)
        client.audio_write.end();
        request = await speech (`./audio_files/${client.request.session.id}`)
        request.on("response", function (res){
            var data = ""
            res.on('data', function (chunk) {
                data += chunk
            });
            res.on('end', function () {
                var res = JSON.parse(data)
                if (res.text && client.text_result !== res.text){
                  console.log(res)
                  client.send(res)
                }
              try{
                fs.unlinkSync(`./audio_files/${client.request.session.id}.wav`)
              } catch (err) {
                throw new Error(err.message)
              }
                                
                
            });
        })
        request.on("error", function (err){
            console.log(err)
            client.send("error")
            try{
              fs.unlinkSync(`./audio_files/${client.request.session.id}.wav`)
            } catch (err) {
              throw new Error(err.message)
            }
        })
    });
  
    client.on('message', async function(data) {
      client.audio_write.write(data)
      client.audio_total++;
      vad.processAudio(data, 16000).then(res => {
        switch (res) {
          case VAD.Event.ERROR:
            break;
          case VAD.Event.NOISE:
            break;
          case VAD.Event.SILENCE:
            if (client.voice_counter >= 3 || client.audio_total >= 5){
              client.silent_counter++;
            }
            break;
          case VAD.Event.VOICE:
            client.voice_counter++;
            break;
        }
      }).catch(console.error);
      
      client.time2 = new Date()
  
      if ((client.silent_counter >= 30) || (client.time2 - client.time1 > client.times[client.times.length - 1] && client.times.length > 0)){
        if(client.silent_counter >= 30){
          client.silent_counter = 0;
          client.send("")
          await sleep(600)
          client.audio_write.end();
          del = true
        }
        if (client.times.length > 0){
          client.times.length = client.times.length-1
        }
        request = await speech (`./audio_files/${client.request.session.id}`)
        request.on("response", function (res){
          var data = ""
          res.on('data', function (chunk) {
            data += chunk
          });
          res.on('error', function (error) {
            console.log(error)
            throw error
          });
          res.on('end', function () {
            var res = JSON.parse(data)
            if (res){
              console.log(res)
              client.send(res)
            }
            if(del){
              try{
                fs.unlinkSync(`./audio_files/${client.request.session.id}.wav`)
              } catch (err) {
                throw new Error(err.message)
              }            }
          });
        })
        request.on("error", function (err){
          console.log(err)
          if(client.silent_counter >= 30){
            client.send("error")
            try{
              fs.unlinkSync(`./audio_files/${client.request.session.id}.wav`)
            } catch (err) {
              throw new Error(err.message)
            }
          }        
        })
      }
    })
  })
  
  function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }
// listen for webhook events
server.listen(process.env.PORT || 3370, () => console.log('webhook is listening'));