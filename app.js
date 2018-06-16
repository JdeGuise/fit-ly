const config = require('./config');

const http = require('http');
const bodyParser = require('body-parser');
const express = require('express');
const twilioClient = require('twilio')(config.ACCOUNT_SID, config.AUTH_TOKEN);
const MessagingResponse = require('twilio').twiml.MessagingResponse;

const twiml = new MessagingResponse();
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.post("/sms", function(req, res) {

  console.log(req);
  if (req.body.Body == 'Y') {
    sendText('Yes');
  } else if (req.body.Body == 'N') {
    sendText('No');
  } else {
    sendText('Didn\'t understand the command.  Try again.');
  }
  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(twiml.toString());
});

function sendText(message) {
  twiml.message(message);
}

http.createServer(app).listen(config.SERVER_PORT, function() {
  console.log('Express server listening on port ' + config.SERVER_PORT);
});
