require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const nodeCron = require('node-cron');
const { Link, Site } = require('./models');
const { fetchHTML, extractInternalLinks, filterLinksByKeywords, normalizeDomain } = require('./scraper');
const { URL } = require('url');

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS || '*' }));

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sale_alert';

// connect mongo
mongoose.connect(MONGODB_URI, { useNewUrlParser:true, useUnifiedTopology:true })
  .then(()=> console.log('MongoDB connected'))
  .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });

// POST /scrape
// body: { url, tags: [] }
app.post('/scrape', async (req, res) => {
  try {
    const { url, tags } = req.body;
    if (!url) return res.status(400).json({ success:false, error:'url required' });
    // normalize domain
    const domain = normalizeDomain(url);
    if (!domain) return res.status(400).json({ success:false, error:'invalid url' });

    // fetch HTML and extract internal links
    const html = await fetchHTML(url);
    const allLinks = extractInternalLinks(html, url);
    const filtered = filterLinksByKeywords(allLinks, tags || []);

    // Save links to DB (upsert)
    const ops = filtered.map(u => ({
      updateOne: {
        filter: { url: u },
        update: { $set: { url: u, domain, lastSeen: new Date(), status: 'active' }},
        upsert: true
      }
    }));
    if (ops.length) await Link.bulkWrite(ops, { ordered:false }).catch(()=>{});

    // update site record
    await Site.updateOne({ domain }, { $set: { domain, lastCrawled: new Date() }}, { upsert: true });

    res.json({ success:true, domain, links: filtered });
  } catch (e) {
    console.error('scrape error', e && e.message);
    res.status(500).json({ success:false, error: String(e) });
  }
});

// GET /links?domain=daraz.pk
app.get('/links', async (req, res) => {
  try {
    const { domain } = req.query;
    if (!domain) return res.status(400).json({ success:false, error:'domain required' });
    const links = await Link.find({ domain, status: 'active' }).sort({ updatedAt:-1 }).limit(1000).lean();
    res.json({ success:true, links });
  } catch(e) {
    res.status(500).json({ success:false, error: String(e) });
  }
});

// Cron job: revalidate links every hour (check 200 links / run)
nodeCron.schedule('0 * * * *', async () => {
  console.log('Cron: revalidate links');
  try {
    const toCheck = await Link.find({ status: 'active' }).limit(200).lean();
    for (const L of toCheck) {
      try {
        const resp = await fetch(L.url, { timeout: 15000, maxRedirects: 3, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SaleAlertBot/1.0)' }});
        if (resp && resp.status && resp.status >= 400) {
          await Link.updateOne({ _id: L._id }, { $set: { status: 'dead' }});
        } else {
          await Link.updateOne({ _id: L._id }, { $set: { lastSeen: new Date() }});
        }
      } catch (e) {
        // treat as dead if fetch fails
        await Link.updateOne({ _id: L._id }, { $set: { status: 'dead' }});
      }
    }
  } catch (e) {
    console.warn('cron error', e && e.message);
  }
});

app.listen(PORT, ()=> console.log('Server listening on', PORT));
