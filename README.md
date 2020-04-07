# Indigenous for Desktop

An IndieWeb app with extensions for sharing information to micropub endpoints and reading 
from microsub endpoints. Written in Electron, so available for Windows, MacOS and Linux.

The philosophy at the moment of the app is that it will not be a full blown client like
the Android version. The main focus is on the most common features used on a daily basis.

Looking for the Android client? See https://github.com/swentel/indigenous-android

## Functionality

- General
  - Uses the font of your system
- Microsub
  - Starts with default anonymous account with the reader connected to  https://indigenous.realize.be
  - Read channels and posts per timeline
  - Inline reply, like, bookmark and repost with or without confirmation
  - Listen to audio or watch video
  - Long articles open in an overlay
  - Mark all read button
  - Navigate posts with keyboard shortcuts:
    - p: previous post
    - n: next post, triggers 'load more posts' at the end too.
    - r: when a post has a read more button, open the overlay
    - c: close overlay when opened
- Micropub
  - Post types: note/article
  - Single photo upload
  - Syndication targets
  - Publish date and status
  - Tags, with autocomplete
  - Upload a file to media endpoint (soon in posts)
- Accounts: configure endpoints and token
- Developer: view response of microsub requests in console

Video of first release: https://www.youtube.com/watch?v=7egdRBg70XA

## Installation

See the releases page: https://github.com/swentel/indigenous-desktop/releases

## Development or installation from source

You can also run this application if you are familiar with development tools. Make sure
to have the most stable version running of npm.

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
