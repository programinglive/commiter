const fs = require('fs');
const path = require('path');

const DEFAULT_MAX_RELEASES = 5;
const RELEASE_NOTES_PATH = path.join(__dirname, '..', 'docs', 'release-notes', 'RELEASE_NOTES.md');
const INDEX_PATH = path.join(__dirname, '..', 'web', 'index.html');
const MARKER_START = '<!-- RELEASES_TIMELINE:START -->';
const MARKER_END = '<!-- RELEASES_TIMELINE:END -->';

function readFileOrThrow(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found at ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function sanitizeText(text = '') {
  return text
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(text = '') {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(dateString) {
  if (!dateString) {
    return 'Date pending';
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.valueOf())) {
    return dateString;
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function extractReleaseSections(content) {
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const tableEntries = extractReleaseTableEntries(normalizedContent);
  const detailMap = extractReleaseDetailsMap(normalizedContent);

  if (tableEntries.length === 0) {
    return extractSectionEntries(normalizedContent);
  }

  return tableEntries.map((entry) => {
    const details = detailMap.get(entry.version) || {};
    return {
      version: entry.version,
      releaseType: details.releaseType || '',
      date: entry.date,
      description: details.description || entry.highlight || 'See CHANGELOG for details.'
    };
  });
}

function extractReleaseTableEntries(content) {
  const lines = content.split('\n');
  const headerIndex = lines.findIndex((line) => /^\|\s*Version\s*\|/i.test(line));
  if (headerIndex === -1) {
    return [];
  }

  const entries = [];
  for (let i = headerIndex + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim().startsWith('|')) {
      break;
    }
    const cells = line.split('|').slice(1, -1).map((cell) => sanitizeText(cell));
    if (cells.length < 3) {
      continue;
    }
    const [version, date, highlight] = cells;
    if (!version) {
      continue;
    }
    entries.push({ version, date, highlight });
  }

  return entries;
}

function extractReleaseDetailsMap(content) {
  const map = new Map();
  const sectionRegex = /^##\s+(.+?)\s*$([\s\S]*?)(?=^##\s+|$)/gm;
  let match;

  while ((match = sectionRegex.exec(content)) !== null) {
    const heading = match[1].trim();
    const body = match[2].trim().replace(/\r/g, '');
    const headingMatch = heading.match(/^(\d+\.\d+\.\d+)(?:\s+[–-]\s+(.+))?/);
    if (!headingMatch) {
      continue;
    }

    const version = headingMatch[1];
    const releaseType = headingMatch[2] ? headingMatch[2].trim() : '';
    const descriptionMatch = body.match(/^\s*\-\s+(.+)$/m);
    const description = descriptionMatch ? sanitizeText(descriptionMatch[1]) : undefined;

    map.set(version, {
      releaseType,
      description
    });
  }

  return map;
}

function extractSectionEntries(content) {
  const sections = [];
  const sectionRegex = /^##\s+(.+?)\s*$([\s\S]*?)(?=^##\s+|$)/gm;
  let match;

  while ((match = sectionRegex.exec(content)) !== null) {
    const heading = match[1].trim();
    const body = match[2].trim().replace(/\r/g, '');
    const headingMatch = heading.match(/^(\d+\.\d+\.\d+)(?:\s+[–-]\s+(.+))?/);
    if (!headingMatch) {
      continue;
    }

    const version = headingMatch[1];
    const releaseType = headingMatch[2] ? headingMatch[2].trim() : '';
    const dateMatch = body.match(/Released on \*\*(\d{4}-\d{2}-\d{2})\*\*\.?/);
    const descriptionMatch = body.match(/^\s*\-\s+(.+)$/m);

    sections.push({
      version,
      releaseType,
      date: dateMatch ? dateMatch[1] : undefined,
      description: descriptionMatch ? sanitizeText(descriptionMatch[1]) : 'See CHANGELOG for details.'
    });
  }

  return sections;
}

function renderReleaseItem(release, { latest = false, indent = '' } = {}) {
  const badge = latest ? `\n${indent}    <div class="release-badge">Latest</div>` : '';
  const typeLine = release.releaseType
    ? `\n${indent}    <div class="release-type">${escapeHtml(release.releaseType)}</div>`
    : '';

  return `${indent}<div class="release-item">${badge}
${indent}    <div class="release-version">v${escapeHtml(release.version)}</div>
${indent}    <div class="release-date">${escapeHtml(formatDate(release.date))}</div>${typeLine}
${indent}    <p class="release-description">${escapeHtml(release.description)}</p>
${indent}</div>`;
}

function updateIndexHtml({
  htmlContent,
  releases,
  markerStart = MARKER_START,
  markerEnd = MARKER_END,
  indent = '                '
}) {
  const startIndex = htmlContent.indexOf(markerStart);
  const endIndex = htmlContent.indexOf(markerEnd);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error('Release timeline markers not found in web/index.html');
  }

  const before = htmlContent.slice(0, startIndex + markerStart.length);
  const after = htmlContent.slice(endIndex);
  const timeline = releases
    .map((release, idx) => renderReleaseItem(release, { latest: idx === 0, indent }))
    .join('\n');

  return `${before}\n${timeline}\n${indent}${after.trimStart()}`;
}

function updateWebReleases({
  releaseNotesPath = RELEASE_NOTES_PATH,
  indexPath = INDEX_PATH,
  maxReleases = DEFAULT_MAX_RELEASES
} = {}) {
  const notesContent = readFileOrThrow(releaseNotesPath, 'Release notes');
  const releases = extractReleaseSections(notesContent).slice(0, maxReleases);

  if (releases.length === 0) {
    console.warn('⚠️  No release sections found; skipping website update.');
    return false;
  }

  const htmlContent = readFileOrThrow(indexPath, 'Landing page');
  const nextContent = updateIndexHtml({ htmlContent, releases });
  fs.writeFileSync(indexPath, nextContent);
  console.log(`✅ Updated website releases timeline with ${releases.length} entries.`);
  return true;
}

function main() {
  try {
    updateWebReleases();
  } catch (error) {
    console.error(`❌ Failed to update website releases timeline: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  escapeHtml,
  sanitizeText,
  formatDate,
  extractReleaseSections,
  renderReleaseItem,
  updateIndexHtml,
  updateWebReleases,
  MARKER_START,
  MARKER_END
};

if (require.main === module) {
  main();
}
