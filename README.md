# Odinbook (API)

Backend API for a small Facebook clone.

For the Frontend client go [here](https://github.com/gizinski-jacek/odinbook-client).

## Table of contents

- [Github & Live](#github--live)
- [Getting Started](#getting-started)
- [Deploy](#deploy)
- [Features](#features)
- [Status](#status)
- [Contact](#contact)

# Github & Live

Github repo can be found [here](https://github.com/gizinski-jacek/odinbook-api).

Live demo can be found on [Heroku](https://odinbook-api-48463.herokuapp.com).

## Getting Started

Install all dependancies by running:

```bash
npm install
```

In the project root directory run the app with:

```bash
npm run devstart
```

Open [http://localhost:4000](http://localhost:4000) to view it in the browser.

## Deploy

You can easily deploy this app using [Heroku Platform](https://devcenter.heroku.com/articles/git).

Script for running app build after deployment to Heroku is included in package.json.\
In the project root directory run these commands:

```bash
curl https://cli-assets.heroku.com/install-ubuntu.sh | sh
heroku create
git push heroku main
heroku open
```

You cannot deploy both Frontend and Backend to Heroku because [Heroku is included in Suffix List](https://devcenter.heroku.com/articles/cookies-and-herokuapp-com), which prevents an app on heroku domain from setting cookies on other heroku apps.\
You can either use [Custom Domain](https://devcenter.heroku.com/articles/custom-domains) or deploy either app to other hosting service like [Netlify](https://docs.netlify.com/cli/get-started).\
I recommend deploying [Frontend client](https://github.com/gizinski-jacek/odinbook-client#deploy) of this app to Netlify.

## Features

- API endpoints for:
  - Creating and authenticating users
  - Uploading and deleting user profile picture
  - Creating, editing and deleting posts and comments
  - Uploading and deleting post image
  - Sending and cancelling friend requests
  - Removing and blocking users
  - Searching for users and posts
- Utilizing cookies for storing JWT
- Logging in with Facebook account
- Real-time notifications and chat using socket.io

## Status

Project status: **_FINISHED_**

## Contact

Feel free to contact me at:

```
gizinski.jacek.tr@gmail.com
```
