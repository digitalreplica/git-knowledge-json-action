const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');

/* Example file from getContent().data[]
{
  name: 'writing-exploits.md',
  path: 'writing-exploits.md',
  sha: '398116fe6039ddee1a6eb321629f36b210eabd28',
  size: 830,
  url: 'https://api.github.com/repos/digitalreplica/hacking/contents/writing-exploits.md?ref=main',
  html_url: 'https://github.com/digitalreplica/hacking/blob/main/writing-exploits.md',
  git_url: 'https://api.github.com/repos/digitalreplica/hacking/git/blobs/398116fe6039ddee1a6eb321629f36b210eabd28',
  download_url: 'https://raw.githubusercontent.com/digitalreplica/hacking/main/writing-exploits.md',
  type: 'file',
  _links: [Object]
}
*/
async function getRepoMarkdownFiles(octokit, owner, repo, repoPath='') {
  let repoContents = await octokit.rest.repos.getContent({
    owner: owner,
    repo: repo,
    path: repoPath
  });
  let markdownFiles = [];

  // Loop over files, recursing if directory, adding to list if markdown
  for (file of repoContents.data) {
    if (file.type == 'dir') {
      const markdownFilesFromDir = await getRepoMarkdownFiles(
        octokit, owner, repo, file.path
      );
      markdownFiles = markdownFiles.concat(markdownFilesFromDir);
    } else {
      if (path.extname(file.name) == '.md') {
        markdownFiles.push(file)
      }
    }
  }
  return markdownFiles
}

function getTagsForUrl(url) {
  const tags = []

  // Remove .md extension
  url = url.replace(".md", "");

  // Split on '/' and remove unwanted elements
  urlSegments = url.split('/');
  urlSegments.splice(5,2);  // Remove /blob/<repo>/
  urlSegments.splice(0,3);  // Remove https://github.com/

  // Split each segment on '-' and save tag
  for (urlSegment of urlSegments) {
    for (tag of urlSegment.split('-')) {
      tags.push(tag.toLowerCase())
    }
  }
  return tags;
}

async function run() {
  const myToken = core.getInput('repo-token');
  //const myToken = process.env.GITHUB_TOKEN;
  const octokit = github.getOctokit(myToken)
  const knowledgeData = {
    tags: {},
    files: {},
  }

  // Read list of repos from repos.txt
  // * one line per repo, formatted like '<owner>/repo'
  // * ex: 'digitalreplica/hacking'
  const reposListPath = core.getInput('repo-list-path');
  const reposData = fs.readFileSync(reposListPath, {encoding:'utf8', flag:'r'});
  const repos = reposData.split(/\r?\n/);

  // Loop over all repos, given as owner/repo strings
  let owner, repo;
  for (let ownerRepo of repos) {
    if (ownerRepo.length == 0) { continue; }
    [owner, repo] = ownerRepo.split('/');
    const repoMarkdownFiles = await getRepoMarkdownFiles(
      octokit, owner, repo
    );
    for (file of repoMarkdownFiles) {
      console.log(file.html_url);
      let filenameWithRepo = `${owner}/${repo}/${file.path}`
      // Add subset of file properties to files
      knowledgeData.files[filenameWithRepo] = {
        name: file.name,
        path: file.path,
        size: file.size,
        html_url: file.html_url,
        repo: ownerRepo
      }

      // Add files to a list under each tag
      let tags = getTagsForUrl(file.html_url);
      for (let tag of tags) {
        if (knowledgeData.tags[tag]) {
          knowledgeData.tags[tag].push(filenameWithRepo)
        } else {
          knowledgeData.tags[tag] = []
          knowledgeData.tags[tag].push(filenameWithRepo)
        }
      }
    }
  }
  //console.log(knowledgeData)

  // convert JSON object to string
  const jsonKnowledgeData = JSON.stringify(knowledgeData, null, 1);

  // write JSON string to a file
  const knowledgeJsonPath = core.getInput('knowledge-json-path');
  fs.writeFile(knowledgeJsonPath, jsonKnowledgeData, (err) => {
    if (err) {
        throw err;
    }
    console.log("Knowledge data saved to knowledge.json");
  });

}

run();
