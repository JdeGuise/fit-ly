const config = require('./config');
// const pool = require('./database');

const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const {PubSub} = require('@google-cloud/pubsub');

// const http = require('http');
// const bodyParser = require('body-parser');
// const express = require('express');

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

function buildTextMessage(caloriesBurned, distanceRan, runningTime, createdDate=null) {
    message += 'Calories burned today: ' + caloriesBurned + '.\n';
    message += 'Total distance ran: ' + distanceRan + '.\n';
    message += 'Daily running time: ' + runningTime + '.\n';
    if(createdDate) {
        const dateTime = createdDate.split(' ');
        message += '\nThis entry is a manual entry, with a specified created date of ' + dateTime[0] + ' and an input time of ' + dateTime[1] + '.\n';    
    }
    return message;
}

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
  const TOKEN_PATH = 'token.json';

  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, TOKEN_PATH, callback);
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
function getNewToken(oAuth2Client, TOKEN_PATH, callback) {
  const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

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
  const TOPIC_ID = PROJECT_ID + '-topic';
  const SUB_ID = 'projects/' + PROJECT_ID + '/subscriptions/' + TOPIC_ID + '-sub';

  const GOOGLE_GMAIL_USER = google.gmail({version: 'v1'}).users;
  const TOPIC_STR = 'projects/' + PROJECT_ID + '/topics/' + TOPIC_ID;
  initGmailWatcher(
    GOOGLE_GMAIL_USER,
    {
      userId: 'me',
      auth: auth,
      resource: {
        labelIds: ['INBOX'],
        topicName : TOPIC_STR
      }
    }
  );

  const messageHandler = message => {
    const gmailQuery = "from:" + config.PHONE_NUMBER_EMAIL;
    GOOGLE_GMAIL_USER.messages.list({userId: 'me', auth: auth, q: gmailQuery}).then((listData) => {
      GOOGLE_GMAIL_USER.messages.get({userId: 'me', auth: auth, id: listData.data.messages[0].id}).then((messageData) => {
        let dataPoints = messageData.data.snippet.split('; ');

        // we want to verify the list split
        // we're expecting something like "[ '10/02/21', '4.52km', '35:00', '346' ]"
        if(dataPoints.length > 1) {
          console.log(dataPoints);
        }
      });
    });

    message.ack();
  };

  new PubSub({
    PROJECT_ID,
    keyFilename: '/home/john/Desktop/fit-ly/fitly-service.json'
  }).subscription(SUB_ID).on('message', messageHandler);
}

function initGmailWatcher(googleGmailUsers, options) {
  googleGmailUsers.watch(options, (err, res) => {
    if(err) {
      console.log(err);
    } else {
      console.log(res.data.expiration - Date.now());
    }
  });
}