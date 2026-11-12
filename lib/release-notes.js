'use strict';
const fs = require('node:fs');
const path = require('node:path');

function extractChangelogInfo({changelogContent, version}) {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const header = new RegExp(`^###? \\[?${escaped}\\]?[^\\n]*`, 'm').exec(changelogContent);
  if (!header) return {bullets:[], heading:''};
  const rest = changelogContent.slice(header.index + header[0].length).split(/^##? /m)[0];
  const bullets = [...rest.matchAll(/^\*\s+(.+)$/gm)].map(m => sanitizeText(m[1]));
  return { date: header[0].match(/\((\d{4}-\d{2}-\d{2})\)/)?.[1], bullets, highlight:bullets[0], heading:'' };
}
function sanitizeText(text) { return text.replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/\s+/g,' ').trim(); }
function escapePipes(text) { return String(text).replace(/\|/g, '\\|'); }
function formatDate(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function insertReleaseNotesEntry({content, version, releaseDate, highlight, sectionHeading, detailBullets}) {
  const lines = content.split('\n');
  const table = lines.findIndex(line => /^\|\s*:?-{3,}/.test(line));
  const detail = [``, `## ${version}${sectionHeading ? ` – ${sectionHeading}` : ''}`, '', `Released on **${releaseDate}**.`, '', ...(detailBullets || []).map(x => `- ${x}`), ''];
  if (table < 0) return `${content.trimEnd()}\n${detail.join('\n')}\n`;
  lines.splice(table+1,0,`| ${version} | ${releaseDate} | ${escapePipes(highlight)} |`);
  const section = lines.findIndex((line,i) => i > table && line.startsWith('## '));
  if (section < 0) lines.push(...detail); else lines.splice(section,0,...detail);
  return lines.join('\n');
}
function updateReleaseNotes({rootDir=process.cwd(), releaseNotesRelativePath='docs/release-notes/RELEASE_NOTES.md', now=()=>new Date()} = {}) {
  const file = path.join(rootDir,releaseNotesRelativePath);
  const changelog = path.join(rootDir,'CHANGELOG.md');
  if (!fs.existsSync(file) || !fs.existsSync(changelog)) return false;
  const version = JSON.parse(fs.readFileSync(path.join(rootDir,'package.json'),'utf8')).version;
  const content = fs.readFileSync(file,'utf8');
  if (content.includes(`## ${version}`) || content.includes(`| ${version} |`)) return false;
  const info = extractChangelogInfo({changelogContent:fs.readFileSync(changelog,'utf8'),version});
  const next = insertReleaseNotesEntry({content,version,releaseDate:info.date || formatDate(now()),highlight:info.highlight || 'See CHANGELOG for details.',sectionHeading:info.heading,detailBullets:info.bullets.length ? info.bullets : ['See CHANGELOG for details.']});
  fs.writeFileSync(file,next);
  return true;
}
module.exports = {updateReleaseNotes, insertReleaseNotesEntry, extractChangelogInfo, sanitizeText, escapePipes, formatDate};
