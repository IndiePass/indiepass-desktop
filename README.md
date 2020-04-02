# Indigenous for Desktop

An IndieWeb app with extensions for sharing information to micropub endpoints and reading 
from microsub endpoints. Written in Electron, so available for Windows, MacOS and Linux.

The philosophy at the moment of the app is that it will not be a full blown client like
the Android version. The main focus is on the most commonly features used on a daily basis.

Looking for the Android client? See https://github.com/swentel/indigenous-android

## Functionality

- Accounts: configure endpoints and token
- Starts with default anonymous account with the reader connected to 
https://indigenous.realize.be
- Microsub
  - Read channels and posts per timeline
  - Inline reply, like and repost with or without confirmation
  - Listen to audio or watch video
  - Mark all read button
- Micropub
  - Post types: note/article
  - Single photo upload
  - Published status

## Installation

There are no releases yet. See development how to run this locally with the necessary
development tools.

## Development

To clone and run this repository you'll need [Git](https://git-scm.com) and 
[Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) 
installed on your computer. From your command line:

```bash
# Clone this repository
git clone https://github.com/swentel/indigenous-desktop
# Go into the repository
cd indigenous-desktop
# Install dependencies
npm install
# Run the app
npm start
```

## Credits

This app uses following libraries:

- https://github.com/electron/electron
- https://github.com/sindresorhus/electron-store
- https://jquery.com
- https://iamceege.github.io/tooltipster

## Other Micropub and Microsub clients

There are ton of other (mobile) clients, see https://indieweb.org/Micropub/Clients and
https://indieweb.org/Microsub
