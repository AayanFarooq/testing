# Sale Alert Backend (Node.js)

## What is included
- Express server
- /scrape POST endpoint (url + tags) -> returns filtered internal links
- MongoDB (Mongoose) model to store links per domain
- node-cron job to revalidate stored links and remove broken ones

## Install
1. Copy `.env.example` to `.env` and set `MONGODB_URI` and `PORT`.
2. `npm install`
3. `npm start`

## API
POST /scrape
- body: { "url": "https://www.daraz.pk", "tags": ["shirt", "tshirt"] }
- response: { success:true, links:[...], domain:"daraz.pk" }

