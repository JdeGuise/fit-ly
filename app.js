const config = require('./config');

const http = require('http');
const bodyParser = require('body-parser');
const express = require('express');
const twilioClient = require('twilio')(config.ACCOUNT_SID, config.AUTH_TOKEN);
const MessagingResponse = require('twilio').twiml.MessagingResponse;

const twiml = new MessagingResponse();
const app = express();

function sendText(message) {
  twiml.message(message);
}

function buildTextMessage(
  dayInCycle, caloriesBurned, distanceRan, runningTime, runningCycleOnDays) {

  if (dayInCycle > runningCycleOnDays) {
    var message = 'Today was day ' + (runningCycleOnDays + 1) + ', a rest day.\n'
  } else {
    var message = 'Today was day ' + dayInCycle + ' of ' + runningCycleOnDays + ' in running.\n';
  }
  message += 'Calories burned today: ' + caloriesBurned + '.\n';
  message += 'Total distance ran: ' + distanceRan + '.\n';
  message += 'Daily running time: ' + runningTime + '.\n';
  return message;
}

app.use(bodyParser.urlencoded({ extended: false }));
app.post("/sms", function(req, res) {
  // Response must be formatted as: 1-4; 396; 3.2mi; 31:30
  const responseDetails = req.body.Body.split('; ');
  const runningCycleOnDays = 3;

  sendText(
    buildTextMessage(responseDetails[0],responseDetails[1],
      responseDetails[2], responseDetails[3], runningCycleOnDays)
  );

  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(twiml.toString());
});

http.createServer(app).listen(config.SERVER_PORT, function() {
  console.log('Express server listening on port ' + config.SERVER_PORT);
});
