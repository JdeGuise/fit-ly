const config = require('./config');

const http = require('http');
const bodyParser = require('body-parser');
const express = require('express');
const twilioClient = require('twilio')(config.ACCOUNT_SID, config.AUTH_TOKEN);
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const twiml = new MessagingResponse();

const { Client } = require('pg');
const postgresClient = new Client({
    host: config.POSTGRES_DB_HOST,
    port: config.POSTGRES_DB_PORT,
    user: config.POSTGRES_DB_USER,
    password: config.POSTGRES_DB_PASS,
    database: config.POSTGRES_DB_NAME
});

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

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

app.post("/sms", function(req, res) {

    // Response must be formatted as: 1-4; 396; 3.2mi; 31:30
    const responseDetails = req.body.Body.split('; ');
    const runningCycleOnDays = 3;

    postgresClient.connect((err) => {
        if (err) {
            console.log('connection error: ' + err.stack);
        }
        else {
            const shouldAbort = (err) => {
                if (err) {
                    console.error('Error in transaction', err.stack);
                    postgresClient.query('ROLLBACK', (err) => {
                        if (err) {
                           console.error('Error rolling back client', err.stack);
                        }
                    });
                }
                return !!err
            }
            postgresClient.query('BEGIN', (err) => {
                if (shouldAbort(err)) return;

                postgresClient.query("INSERT into dailyfitnessstatistics(dayincycle, caloriesburned, distanceran, runningtime) VALUES($1, $2, $3, $4) RETURNING id",
                    [responseDetails[0], responseDetails[1], responseDetails[2], responseDetails[3]], (err, res) => {
                        
                    if (shouldAbort(err)) return;

                    postgresClient.query('COMMIT', (err) => {
                        if (err) {
                            console.error('Error committing transaction', err.stack);
                        }
                    })
                });
            });
        }
    });

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