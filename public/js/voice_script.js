        // Scroll to top
        $("html, body").animate({ scrollTop: 0 }, "slow");
        
        // Variables
        var trigger_alt = 0;
        var start = false;
        var recording;
        var time1;
        var time2;
        var notification;
        // Socket IO connection and message handling
        const socket = io.connect("/socket");
        socket.on('message', function(msg) {
            recording = false;
            if (msg === "error"){
                document.getElementById("message").innerHTML =  "Error!"
            } else {
                console.log(msg)
                if (msg.text && msg.text.length > 1){
                    if (msg.intents[0] && msg.intents[0].name){
                        console.log(msg.intents[0].name)
                        if (msg.intents[0].name === "Scd"){
                            window.scrollBy({
                                top: 200,
                                behavior: 'smooth'
                            });
                            document.getElementById("message").innerHTML =  `Scrolling Down.`
                        } else if (msg.intents[0].name === "Scu"){
                            window.scrollBy({
                                top: -200,
                                behavior: 'smooth'
                            });
                            document.getElementById("message").innerHTML =  `Scrolling Up.`
                        } else {
                            document.getElementById("message").innerHTML =  `Sorry, I can't understand "${msg.text}"`
                        }
                    } else {
                        document.getElementById("message").innerHTML =  `Sorry, I can't understand "${msg.text}"`
                    }

                } else {
                    document.getElementById("message").innerHTML =  "Long Silence.."
                }
            }
            // Dismiss the notification window
            setTimeout(function(){
                notification.close()
            }, 1800);
        });
        // Check permissions and start App
        check_app();
        async function check_app(){
            var permission_state =  await check_audio();
            if (!permission_state){
                // Show error if no permission is granted
                voice();
                document.getElementById("message").innerHTML =  "No Audio! Please refresh and/or grant permission."
            } else {
                // Start the app
                app()
                start = true
            }
        }
        // Ask for audio permissions
        async function check_audio(){
            var result;
            let audioIN = {
                audio:true
            }
            await navigator.mediaDevices.getUserMedia(audioIN)
            .then(async function () {
                result =  true
            })
            .catch( error => {
                if (error){
                    result = false;
                }
            });
            return result;
        }
        // Sleep function
        function sleep (time) {
            return new Promise((resolve) => setTimeout(resolve, time));
        }
        // Listen for hotword.
        async function listen(transferRecognizer){
            trigger_alt = 0;
            await transferRecognizer.listen(result => {
                if (result.scores[1] > result.scores[0]){
                    trigger_alt ++;
                } else if (trigger_alt >= 2){
                    voice()
                    document.getElementById("message").innerHTML =  "Hotword detected.<br><br>Analyzing...."
                    transferRecognizer.stopListening();
                    trigger_alt = 0;
                    trigger(transferRecognizer);
                }
            }, {
                probabilityThreshold: 0.92,
                overlapFactor: 0.1
            });
            return;
        }
        // If hotword detected call the server.
        async function trigger(transferRecognizer){
            socket.emit("start", {})
            record()
            recording = true;
            time1 = new Date();
            while (recording){
                trigger_alt = 0;
                await sleep (1200)
                if ((time2 - time1) > 17000){
                    socket.emit("end", {})
                    recording = false;
                }
            }
            check_app()
            trigger_alt = 0;
            await sleep(2500)
            trigger_alt = 0;
            listen(transferRecognizer)
            return;
        }
        // convert audio and handling buffer.
        function convertoFloat32ToInt16(buffer) {
            var l = buffer.length;
            var buf = new Int16Array(l)
            while (l--) {
            buf[l] = buffer[l]*0xFFFF;
            }
            socket.send(buf)
            return;
        }
        // Record and handlle audio
        async function record(){
            let audioIN = {
            audio:
            {
                "mandatory": {
                    "googEchoCancellation": "true",
                    "googAutoGainControl": "false",
                    "googNoiseSuppression": "true",
                    "googHighpassFilter": "true",
                    "googNoiseReduction": "true",
                    "echoCancellation": "true"
                },
                "optional": []
            }
            }
            await navigator.mediaDevices.getUserMedia(audioIN)
            .then(function (stream) {
            var audioContext = window.AudioContext || window.webkitAudioContext;
            var context = new audioContext();
            var audioInput = context.createMediaStreamSource(stream);
            var bufferSize = 4096 * 2;
            var recorder = context.createScriptProcessor(bufferSize, 1, 1);
            recorder.connect(context.destination)
            audioInput.connect(recorder)
            recorder.onaudioprocess = function(e){
            if (recording) {
                time2 = new Date()
                var left = e.inputBuffer.getChannelData(0);
                var sampleRateRatio = audioInput.context.sampleRate / 16000
                var newLength = Math.round(left.length / sampleRateRatio);
                var result = new Float32Array(newLength);
                var offsetResult = 0;
                var offsetBuffer = 0;
                while (offsetResult < result.length) {                   
                var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
                // Use average value of skipped samples
                var accum = 0, count = 0;
                for (var i = offsetBuffer; i < nextOffsetBuffer && i < left.length; i++) {
                    accum += left[i];
                    count++;
                }
                result[offsetResult] = accum / count;
                offsetResult++;
                offsetBuffer = nextOffsetBuffer;
                }
                convertoFloat32ToInt16(result);
            } else {
                recorder.disconnect(context.destination)
                audioInput.disconnect(recorder)
            }
            }
            })
            .catch( error => {
            if (error){
                result = false;
            }
            });
        }
        // convert audio and handling buffer.
        async function app() {
            const recognizer = speechCommands.create('BROWSER_FFT');
            await recognizer.ensureModelLoaded();
            const transferRecognizer = recognizer.createTransfer('load');
            await transferRecognizer.load('/model.json')
            .then(async function(){
            transferRecognizer.words = ["noise", "word"]
            while (start == false){
                await sleep (800)
            }
            listen(transferRecognizer);
            return;
            });
        }

        // Function to display transcript
        async function voice(){
            notification = $.notify({
                message:''
            },
            {
                element: 'body',
                position: null,
                type:'dark',
                allow_dismiss:false,
                newest_on_top:false ,
                mouse_over:false,
                showProgressbar:false,
                timer:6000,
                placement:{
                    from:'bottom',
                    align:'center'
                },
                offset: 20,
                delay:12000 ,
                z_index:10000,
                animate:{
                    enter:'animated bounce',
                    exit:'animated flash'
                },
                template: '<div data-notify="container" class="alert_dark">' +
                '<center><span data-notify="message" id = "message">{2}</span></center>' +
                '</div>' 
            });
        }