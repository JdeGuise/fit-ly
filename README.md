# Fitness Tracker

The purpose of this app is to help me track my fitness statistics for the day, as well as taking a further look at trends over time.

It is designed to use Twilio and Ngrok to accept text messages from a phone, so that I can track calories burned, amount of time spent running, distance ran, what day of my exercise cycle this was for, and any pictures or media that may be relevant to logging information.

## Twilio

Requirement: A Twilio account with a purchased phone number

## Ngrok

Every time that ngroke.exe is re-executed, it will update the Forwarding URL on the session page.  This URL needs to be copied and pasted into the Twilio config for webhooking incoming text messages.