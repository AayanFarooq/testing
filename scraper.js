const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

const DEFAULT_KEYWORDS = ["deal","offer","sale","discount","%","festival","coupon","flat","upto","save"];

async function fetchHTML(url, timeout = 20000) {
  const res = await axios.get(url, { timeout, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SaleAlertBot/1.0)' }});
  return res.data;
}

function normalizeDomain(urlStr) {
  try {
    const u = new URL(urlStr);
    return u.hostname.replace(/^www\./,'');
  } catch (e) { return null; }
}

function extractInternalLinks(html, baseUrl) {
  const $ = cheerio.load(html);
  const links = new Set();
  const base = new URL(baseUrl);
  $('a[href]').each((i, el) => {
    try {
      const href = $(el).attr('href');
      if (!href) return;
      const u = new URL(href, base);
      if (u.hostname.replace(/^www\./,'') === base.hostname.replace(/^www\./,'')) {
        // strip fragments
        u.hash = '';
        links.add(u.toString());
      }
    } catch(e) {}
  });
  return Array.from(links);
}

function filterLinksByKeywords(links, tags=[]) {
  const keywords = (tags && tags.length) ? tags.map(t=>t.toLowerCase()) : DEFAULT_KEYWORDS;
  return links.filter(l => {
    const lower = l.toLowerCase();
    return keywords.some(k => lower.includes(k));
  });
}

module.exports = { fetchHTML, extractInternalLinks, filterLinksByKeywords, normalizeDomain };
