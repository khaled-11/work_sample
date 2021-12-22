const https = require('https');
const fs = require("fs");

module.exports = async (file_name) => {
  // Try the request after setting up the request_body.
  var request;
  try {
    const options = {
      host:"api.wit.ai",
      path:"/speech?v=20200513",
      method: 'POST',
      headers: {
        'Authorization': `Bearer HSBFUIF3GEB2PDKZZEPQAXC4TVLP7PCS`,
        'Content-Type': "audio/wav",
        "Transfer-encoding": "chunked"
      }
    };
    request = https.request(options)
    yt = fs.createReadStream(`./${file_name}.wav`);
    yt.on('data', async function (chunk) {
      request.write(chunk);
    });
    yt.on('end', async function () {
      request.end();
    });
  }
  catch (e){
    console.log(e)
  }
  return request;
};