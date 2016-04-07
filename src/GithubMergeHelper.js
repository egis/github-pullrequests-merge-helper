import * as fs from 'fs';
import * as github from 'github';
import * as parseGithubUrl from '@bahmutov/parse-github-repo-url';

const env = process.env;
const GitHubApi = github.default;
const parseSlug = parseGithubUrl.default;

const GH_TOKEN_KEY = 'GH_TOKEN';

export default class GithubMergeHelper {
  readConfig() {
    let repoArg = 'git@github.com:artemv/generator-ruby-starter-kit.git';
    let patternArg = 'Update\s.+\sto\sversion';
    this.pattern = patternArg;
    let [owner, repo] = parseSlug(repoArg);
    this.gitOwner = owner;
    this.gitRepoSlug = repo;
  }

  authenticate() {
    let ghToken = env[GH_TOKEN_KEY] || env.GITHUB_TOKEN;
    if (!ghToken) {
      throw `You need to set the ${GH_TOKEN_KEY} env variable`;
    }

    this.githubApi = new GitHubApi({
      version: '3.0.0'
    });

    this.githubApi.authenticate({
      token: ghToken,
      type: 'oauth'
    });
  }

  getOpenPullRequests() {
    return [{}]; //TODO implement me
  }

  isPrGreen(prData) {
    return true;  //TODO implement me
  }

  fullSlug() {
    return `${this.gitOwner}/${this.gitRepoSlug}`;
  }

  findlastGreenPullRequest() {
    let pullReqs = this.getOpenPullRequests();
    if (pullReqs.length == 0) {
      console.log(`No open pull requests found for ${this.fullSlug()}`);
      return;
    }
    let greenPr = pullReqs.find(this.isPrGreen.bind(this));
    if (!greenPr) {
      console.log(`No green pull requests found for ${this.fullSlug()}`);
      return;
    }
    return {};
  }

  showDiff(pullReq) {
    //TODO implement me
  }

  confirmMergeWithUser(pullReq) {
    return new Promise((resolve) => {
      //TODO implement me
      resolve();
    });
  }

  mergePullRequests(pullReq) {
    //TODO implement me
    console.log('Merged successfully!');
  }

  autoMerge() {
    let pullReq = this.findlastGreenPullRequest();
    if (!pullReq) {
      return;
    }
    console.log(`Here\'s the last green pull request on ${this.fullSlug()}:`);
    console.log('Date:', pullReq.date);
    console.log('Title:', pullReq.title);
    console.log('Submitted by:', pullReq.author);
    this.showDiff(pullReq);
    this.confirmMergeWithUser(pullReq).then(() => {
      this.mergePullRequests(pullReq);
    });
  }

  run() {
    this.readConfig();
    this.authenticate();
    this.autoMerge();
  }
}
