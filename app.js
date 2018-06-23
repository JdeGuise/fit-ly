const config = require('./config');
const pool = require('./database');

const http = require('http');
const bodyParser = require('body-parser');
const express = require('express');
const twilioClient = require('twilio')(config.ACCOUNT_SID, config.AUTH_TOKEN);
const MessagingResponse = require('twilio').twiml.MessagingResponse;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.post("/sms", function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/xml'});
    var twiml = new MessagingResponse();

    // Response must be formatted as: 1-4; 396; 3.2mi; 31:30
    const responseDetails = req.body.Body.split('; ');
    const runningCycleOnDays = 3;
    var newText = buildTextMessage(
        responseDetails[0],
        responseDetails[1],
        responseDetails[2], 
        responseDetails[3], 
        runningCycleOnDays
    );

    pool.connect(function(err, client, done) {
        if (err) throw new Error(err);
        client.query(
            "INSERT into dailyfitnessstatistics(dayincycle, caloriesburned, distanceran, runningtime) VALUES($1, $2, $3, $4) RETURNING id",
            [responseDetails[0], responseDetails[1], responseDetails[2], responseDetails[3]], function(err, result) {
                if (err) throw new Error(err);
            }
        );
    });

    sendText(newText, twiml);
    res.end(twiml.toString());    
});

http.createServer(app).listen(
    config.SERVER_PORT, function() {
        console.log('Express server listening on port ' + config.SERVER_PORT);
    }
);

function sendText(message, twiml) {
    twiml.message(message);
}

function buildTextMessage(dayInCycle, caloriesBurned, distanceRan, runningTime, runningCycleOnDays) {
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