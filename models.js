const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LinkSchema = new Schema({
  domain: { type: String, index: true },
  url: { type: String, unique: true },
  title: String,
  lastSeen: Date,
  status: { type: String, default: 'active' }
}, { timestamps: true });

const SiteSchema = new Schema({
  domain: { type: String, unique: true },
  lastCrawled: Date,
  meta: Schema.Types.Mixed
});

const Link = mongoose.model('Link', LinkSchema);
const Site = mongoose.model('Site', SiteSchema);

module.exports = { Link, Site };
