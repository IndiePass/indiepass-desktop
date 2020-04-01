# Indigenous for Desktop

An IndieWeb app with extensions for sharing information to micropub endpoints and reading 
from microsub endpoints. Written in Electron, so availabl for Windows, MacOS and Linux.

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

## Other Micropub and Microsub clients

There are ton of other (mobile) clients, see https://indieweb.org/Micropub/Clients and
https://indieweb.org/Microsub
