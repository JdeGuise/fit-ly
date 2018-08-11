# Fitness Tracker Heroku App

The purpose of this app is to help track running fitness statistics for the day, as well as taking a further look at trends over time.

It is designed to use Twilio and Ngrok to accept text messages from a phone in order to track calories burned, amount of time spent running, distance ran, what day of exercise cycle this was for, and any pictures or media that may be relevant to logging information about the work out.

## Twilio

Requirement: A Twilio account with a purchased phone number

## Ngrok

An ngrok process must be running on port 3000 on the production machine. Running ngrok over http will provide the admin with an endpoint that needs to be set in Twilio's web interface.

Every time that ngroke.exe is re-executed, it will update the Forwarding URL on the session page.  This URL needs to be copied and pasted into the Twilio config for webhooking incoming text messages.


# Configuration

In Twilio:
	1. Sign in
	2. Navigate to All Products and Services -> Phone Numbers
	3. Click on the phone number you're using
	4. Scroll down to Messaging in the Configure tab
	5. Set Configure With: to 'Webhooks, TwiML Bins, Functions, Studio, or Proxy'
	6. Set A Message comes in: to 'Webhook' (Enter your ngrok endpoint here) 'HTTP POST'

You can now test that this is all set up correctly by attempting to send a text message to your Twilio phone number.  

If you look at the ngrok http process screen, you will see an HTTP response of '200' to your endpoint if this worked as expected.


# Deployment

Without Heroku:

Requirements: 
- ngrok running over port 3000
- hosted postgres database setup to receive data
- Twilio endpoint configured with the local ngrok endpoint

With Heroku:

Requirements:
- ngrok configured to run on Heroku over port 3000
- Heroku postgres addon configured for fit-ly project, schema imported
- Twilio endpoint configured with the Heroku ngrok endpoint


# Database Schema

database - fitness_tracker
table - dailyFitnessStatistics
columns:

- `runningEntryId` `id`
- `dayInRunningCycle` `int`
- `caloriesBurned` `int`
- `totalDistanceRan` `text`
- `runningTimeElapsed` `text`
- `createdDate` `datetime`


# Usage

Currently, two text message formats are supported, auto logging the date and manually creating the date

## AUTO LOG DATE
Response must be formatted as: 1-4; 396; 3.2mi; 31:30

## MANUALLY SPECIFY DATE
Response must be formatted as: 1-4; 396; 3.2mi; 31:30; 06-23-2018 (or 06-23-2018 5:30:00)