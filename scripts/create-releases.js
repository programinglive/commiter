#!/usr/bin/env node

/**
 * Create GitHub Releases from Tags and CHANGELOG
 * 
 * This script reads the CHANGELOG.md file and creates GitHub releases
 * for all tags that don't have releases yet.
 * 
 * Prerequisites:
 * - GitHub Personal Access Token with 'repo' scope
 * - Set as environment variable: GITHUB_TOKEN
 * 
 * Usage:
 * GITHUB_TOKEN=your_token node scripts/create-releases.js
 */

const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');

// Configuration
const REPO_OWNER = 'programinglive';
const REPO_NAME = 'commiter';
const CHANGELOG_PATH = './CHANGELOG.md';

// GitHub API helper
function githubRequest(method, path, data = null) {
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
        console.error('❌ Error: GITHUB_TOKEN environment variable not set');
        console.error('Please set it with: set GITHUB_TOKEN=your_token_here');
        process.exit(1);
    }

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            port: 443,
            path: path,
            method: method,
            headers: {
                'User-Agent': 'Commiter-Release-Script',
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(body || '{}'));
                } else {
                    reject(new Error(`GitHub API error: ${res.statusCode} - ${body}`));
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// Parse CHANGELOG.md to extract release notes
function parseChangelog() {
    const content = fs.readFileSync(CHANGELOG_PATH, 'utf-8');
    const releases = {};

    // Match version headers like: ### [1.1.9](link) (2025-11-24)
    const versionRegex = /### \[(\d+\.\d+\.\d+)\]\([^)]+\) \(([^)]+)\)/g;
    const sections = content.split(versionRegex);

    // Process matches
    let match;
    const matches = [];
    while ((match = versionRegex.exec(content)) !== null) {
        matches.push({
            version: match[1],
            date: match[2],
            index: match.index
        });
    }

    // Extract content for each version
    for (let i = 0; i < matches.length; i++) {
        const current = matches[i];
        const next = matches[i + 1];

        const startIndex = current.index;
        const endIndex = next ? next.index : content.length;

        let releaseContent = content.substring(startIndex, endIndex).trim();

        // Remove the version header line
        releaseContent = releaseContent.split('\n').slice(1).join('\n').trim();

        // Clean up the content
        releaseContent = releaseContent
            .replace(/###\s+\[(\d+\.\d+\.\d+)\].*$/m, '') // Remove next version header if present
            .trim();

        releases[current.version] = {
            version: current.version,
            date: current.date,
            body: releaseContent || 'See CHANGELOG.md for details.'
        };
    }

    return releases;
}

// Get all local tags
function getLocalTags() {
    try {
        const output = execSync('git tag -l', { encoding: 'utf-8' });
        return output.trim().split('\n').filter(Boolean);
    } catch (error) {
        console.error('❌ Error getting local tags:', error.message);
        return [];
    }
}

// Get existing GitHub releases
async function getExistingReleases() {
    try {
        const releases = await githubRequest('GET', `/repos/${REPO_OWNER}/${REPO_NAME}/releases`);
        return new Set(releases.map(r => r.tag_name));
    } catch (error) {
        console.error('❌ Error fetching existing releases:', error.message);
        return new Set();
    }
}

// Create a GitHub release
async function createRelease(tag, releaseData) {
    const data = {
        tag_name: tag,
        name: `${tag}`,
        body: releaseData.body,
        draft: false,
        prerelease: false
    };

    try {
        await githubRequest('POST', `/repos/${REPO_OWNER}/${REPO_NAME}/releases`, data);
        console.log(`✅ Created release for ${tag}`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to create release for ${tag}:`, error.message);
        return false;
    }
}

// Main function
async function main() {
    console.log('🚀 Creating GitHub Releases from CHANGELOG...\n');

    // Parse changelog
    console.log('📝 Parsing CHANGELOG.md...');
    const releases = parseChangelog();
    console.log(`Found ${Object.keys(releases).length} releases in CHANGELOG\n`);

    // Get local tags
    console.log('🏷️  Getting local tags...');
    const localTags = getLocalTags();
    console.log(`Found ${localTags.length} local tags\n`);

    // Get existing GitHub releases
    console.log('🔍 Checking existing GitHub releases...');
    const existingReleases = await getExistingReleases();
    console.log(`Found ${existingReleases.size} existing releases on GitHub\n`);

    // Create releases for tags that don't have them
    console.log('📦 Creating missing releases...\n');
    let created = 0;
    let skipped = 0;

    for (const tag of localTags) {
        const version = tag.replace(/^v/, '');

        if (existingReleases.has(tag)) {
            console.log(`⏭️  Skipping ${tag} (already exists)`);
            skipped++;
            continue;
        }

        const releaseData = releases[version];
        if (!releaseData) {
            console.log(`⚠️  No changelog entry found for ${tag}, using default message`);
            await createRelease(tag, { body: 'See [CHANGELOG.md](CHANGELOG.md) for details.' });
            created++;
        } else {
            await createRelease(tag, releaseData);
            created++;
        }

        // Rate limiting: wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n✨ Done!`);
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`\n🔗 View releases at: https://github.com/${REPO_OWNER}/${REPO_NAME}/releases`);
}

// Run the script
main().catch(error => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
});
