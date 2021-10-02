// const config = require('./config');
// const pool = require('./database');

const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const {PubSub} = require('@google-cloud/pubsub');

// const http = require('http');
// const bodyParser = require('body-parser');
// const express = require('express');
// const twilioClient = require('twilio')(config.ACCOUNT_SID, config.AUTH_TOKEN);
// const MessagingResponse = require('twilio').twiml.MessagingResponse;

// const app = express();
// app.use(bodyParser.urlencoded({ extended: false }));

// app.post("/sms", function(req, res) {
//     res.writeHead(200, {'Content-Type': 'text/xml'});
//     var twiml = new MessagingResponse();
//     var insertQuery;
//     const responseDetails = req.body.Body.split('; ');
//     const runningCycleOnDays = 3;

//     var newText = buildTextMessage(
//         responseDetails[0],
//         responseDetails[1],
//         responseDetails[2], 
//         responseDetails[3], 
//         runningCycleOnDays
//     );

//     if(responseDetails.length >= 5) {
//         newText = buildTextMessage(
//             responseDetails[0],
//             responseDetails[1],
//             responseDetails[2], 
//             responseDetails[3],
//             runningCycleOnDays,
//             responseDetails[4]
//         );
//     }

//     pool.connect(function(err, client, done) {
//         if (err) throw new Error(err);
//         if (responseDetails.length === 4) {
//             insertQuery = "INSERT into dailyfitnessstatistics(dayincycle, caloriesburned, distanceran, runningtime) VALUES($1, $2, $3, $4) RETURNING id";            
//             client.query(
//                 [responseDetails[0], responseDetails[1], responseDetails[2], responseDetails[3]], function(err, result) {
//                     if (err) throw new Error(err);
//                 }
//             );
//         } else if (responseDetails.length === 5) {
//             insertQuery = "INSERT into dailyfitnessstatistics(dayincycle, caloriesburned, distanceran, runningtime, createddate) VALUES($1, $2, $3, $4, $5) RETURNING id";            
//             client.query(
//                 insertQuery, [responseDetails[0], responseDetails[1], responseDetails[2], responseDetails[3], responseDetails[4]], function(err, result) {
//                     if (err) throw new Error(err);
//                 }
//             );
//         }
//     });

//     sendText(newText, twiml);
//     res.end(twiml.toString());    
// });

// http.createServer(app).listen(
//     config.SERVER_PORT, function() {
//         console.log('Express server listening on port ' + config.SERVER_PORT);
//     }
// );

// function sendText(message, twiml) {
//     twiml.message(message);
// }

// function buildTextMessage(dayInCycle, caloriesBurned, distanceRan, runningTime, runningCycleOnDays, createdDate=null) {
//     if (dayInCycle > runningCycleOnDays) {
//         var message = 'Today was day ' + (runningCycleOnDays + 1) + ', a rest day.\n'
//     } else {
//         var message = 'Today was day ' + dayInCycle + ' of ' + runningCycleOnDays + ' in running.\n';
//     }
//     message += 'Calories burned today: ' + caloriesBurned + '.\n';
//     message += 'Total distance ran: ' + distanceRan + '.\n';
//     message += 'Daily running time: ' + runningTime + '.\n';
//     if(createdDate) {
//         const dateTime = createdDate.split(' ');
//         message += '\nThis entry is a manual entry, with a specified created date of ' + dateTime[0] + ' and an input time of ' + dateTime[1] + '.\n';    
//     }
//     return message;
// }

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);

  // Authorize a client with credentials, then call the Gmail API.
  authorize(JSON.parse(content), setupGoogleServices);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));

    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function setupGoogleServices(auth) {
  const PROJECT_ID = 'fitly-327819';
  const TOPIC_ID = 'fitly-327819-topic';
  const SUB_ID = 'fitly-327819-topic-sub ';
  const TOPIC_STR = 'projects/' + PROJECT_ID + '/topics/' + TOPIC_ID;

  const pubsub = new PubSub({
    PROJECT_ID,
    keyFilename: '/home/john/Desktop/fit-ly/fitly-service.json'
  });

  const gmail = google.gmail({version: 'v1', auth});
  pubsub.getTopics(TOPIC_STR).then(data => {


    let options = {
      userId: 'me',
      auth: auth,
      resource: {
        labelIds: ['INBOX'],
        topicName : TOPIC_STR
      }
    };

    console.log('watchin now');
    gmail.users.watch(options, (err, res) => {
      if(err) {
        console.log('found an error');
        console.log(err);
      } else {
        console.log('worked');
        console.log(res.data);
      }
    });
}

  // Creates a subscription on that new topic
  // const [subscription] = await topic.createSubscription(subscriptionName);

  // Receive callbacks for new messages on the subscription
  // subscription.on('message', message => {
  //   console.log('Received message:', message.data.toString());
  //   process.exit(0);
  // });

  // // Receive callbacks for errors on the subscription
  // subscription.on('error', error => {
  //   console.error('Received error:', error);
  //   process.exit(1);
  // });