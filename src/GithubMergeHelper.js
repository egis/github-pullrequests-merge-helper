import * as fs from 'fs';
import * as github from 'github';
import * as parseGithubUrl from '@bahmutov/parse-github-repo-url';

import minimist from 'minimist';
import chalk from 'chalk';

const env = process.env;
const GitHubApi = github.default;
const parseSlug = parseGithubUrl.default;

const GH_TOKEN_KEY = 'GH_TOKEN';

export default class GithubMergeHelper {
  readConfig() {
    let argv = minimist(process.argv.slice(2));
    let repoArg = argv._[0];
    let patternArg = argv.pattern;
    if (!repoArg || !patternArg) {
      throw 'Usage: github-pullrequests-merge-helper git@github.com:artemv/github-pullrequests-merge-helper.git --pattern="Update\\s.+\\sto\\sversion"';
    }
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
      console.log(this.formatNotice(`No open pull requests found for ${this.fullSlug()}.`));
      return;
    }
    let greenPr = pullReqs.find(this.isPrGreen.bind(this));
    if (!greenPr) {
      console.log(this.formatNotice(`No green pull requests found for ${this.fullSlug()}.`));
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
    console.log(chalk.green('Merged successfully!'));
  }

  formatHeading(string) {
    return chalk.cyan(string);
  }

  formatNotice(string) {
    return chalk.yellow(string);
  }

  autoMerge() {
    let pullReq = this.findlastGreenPullRequest();
    if (!pullReq) {
      return;
    }
    console.log(chalk.green(`Here\'s the last green pull request on ${this.fullSlug()}:`));
    console.log(this.formatHeading('Date:'), pullReq.date);
    console.log(this.formatHeading('Title:'), pullReq.title);
    console.log(this.formatHeading('Submitted by:'), pullReq.author);
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
