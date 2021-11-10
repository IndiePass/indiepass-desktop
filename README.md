# Indigenous for Desktop

## September 2021 Update

Firstly thanks to [@swentel](https://github.com/swentel) for the work they've done so far in building and maintaing the desktop version of the app.

Indigenous for Desktop and iOS is now being maintained and developed by @marksuth.

I'm currently going through and getting up to speed with the status of both this, and the desktop versions of the app, and will update soon with my plans for bringing everything up to parity with the excellent Android version, which can be found here: https://github.com/swentel/indigenous-android

----

An IndieWeb app with extensions for sharing information to micropub endpoints and reading 
from microsub endpoints. Written in Electron, so available for Windows, macOS and Linux.

The philosophy at the moment of the app is that it will not be a full blown client like
the Android version. The main focus is on the most common features used on a daily basis.

Android: https://github.com/swentel/indigenous-android  
iOS: https://github.com/marksuth/indigenous-ios

## Screenshot
![Indigenous on Desktop](https://indigenous.marksuth.dev/images/indigenous-desktop-screenshot.png "Indigenous Desktop")

## Functionality

- General
  - Uses the font of your system
  - Account: configure endpoints and token
  - Screen state: remember position, fullscreen etc
  - Developer: view response of microsub requests in console
- Microsub
  - Allow for global unread start screen if the server supports it
  - Different displays: Cards, titles and feed with overlay view
  - Autoload more posts
  - Read channels and posts per timeline
  - Inline responses with or without confirmation
  - Listen to audio or watch video
  - Mark all read button, per item and optionally when viewing detail
  - View individual feed via author name
  - Search in all channels and feeds
  - Delete or move posts, with default channel for moving
  - Navigate posts with keyboard shortcuts:
    - p: previous post in feed or overlay
    - n: next post in feed or overlay, trigger 'More posts' at end
    - r or z: read the post in the overlay
    - c or esc: close overlay when opened
  - Context menu: right click when selecting text to search DuckDuckGo, or save
    an image, or copy the link and so on.
  - External links in posts open in your system browser
- Micropub
  - Post types: note/article
  - Single photo upload
  - Syndication targets
  - Publish date and status
  - Tags, with autocomplete
  - Upload a file to media endpoint (soon in posts)

## Roadmap

There are a few outstanding feaures coming somewhere in the near future:

- Use media endpoint to upload image, and allow multiple
- Show all sources (if the microsub supports method=tree)
- Figure out automatic builds and updates

Note that currently multiple accounts or using the IndieAuth flow is
not on the roadmap. Pull requests welcome of course :)

## Installation

See the releases page: https://github.com/marksuth/indigenous-desktop/releases

## Token generation in WordPress

When you generate a token on WordPress and using Aperture as your Microsub
server, make sure the 'me' value of the token is set to the same as used
in Aperture. Usually, this is just the URL of your website. To make sure
that the 'me' value is set to that, fill in the Website on your profile
and set the 'Set User to Represent Site URL' value to your user on the
IndieAuth settings page.

## Development or installation from source

You can also run this application if you are familiar with development tools. Make sure
to have the most stable version running of npm.

To clone and run this repository you'll need [Git](https://git-scm.com) and 
[Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) 
installed on your computer. From your command line:

```bash
# Clone this repository
git clone https://github.com/marksuth/indigenous-desktop
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
- https://github.com/iamkun/dayjs
- https://craig.is/killing/mice
- https://github.com/zeusdeux/isInViewport
- https://github.com/sindresorhus/electron-context-menu
- https://github.com/mawie81/electron-window-state
- https://github.com/dimsemenov/Magnific-Popup
- https://github.com/HubSpot/pace
- https://github.com/electron-userland/electron-forge

## Other Micropub and Microsub clients

There are ton of other (mobile) clients, see https://indieweb.org/Micropub/Clients and
https://indieweb.org/Microsub
