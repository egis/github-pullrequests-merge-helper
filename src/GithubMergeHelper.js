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
    this.fullSlug = `${this.gitOwner}/${this.gitRepoSlug}`;
    this.branch = 'master';
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

  gitRepoOptions() {
    return {
      user: this.gitOwner,
      repo: this.gitRepoSlug
    };
  }

  getOpenPullRequests() {
    return new Promise((resolve) => {
      let msg = {
        state: 'open',
        base: this.branch,
        sort: 'created',
        direction: 'desc'
      };
      this.githubApi.pullRequests.getAll(Object.assign(this.gitRepoOptions(), msg), (err, data) => {
        if (err) {
          throw new Error(`Couldn't get open PRs list for ${this.fullSlug}: ${err}`);
        }
        resolve(data);
      });
    });
  }

  isPrGreen(prData) {
    return true;  //TODO implement me
  }

  tooBad(caption, resolve) {
    console.log(this.formatNotice(caption));
    resolve();
  }

  filterByPattern(list) {
    return list.filter((item) => {
      return item.title.match(this.pattern);
    });
  }

  findlastGreenPullRequest() {
    return new Promise((resolve) => {
      this.getOpenPullRequests().then((list) => {
        if (list.length == 0) {
          return this.tooBad(`No open pull requests found for ${this.fullSlug}.`, resolve);
        }
        list = this.filterByPattern(list);
        if (list.length == 0) {
          return this.tooBad(`No open pull requests found for pattern ${this.pattern} at ${this.fullSlug}.`, resolve);
        }
        let greenPr = list.find(this.isPrGreen.bind(this));
        if (!greenPr) {
          return this.tooBad(`No green pull requests found for given pattern at ${this.fullSlug}.`, resolve);
        }
        resolve(greenPr);
      });
    });
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
    return chalk.green(string);
  }

  formatNotice(string) {
    return chalk.yellow(string);
  }

  tellAboutPr(pullReq) {
    console.log(`The last ${chalk.green('green')} pull request on ${chalk.green(this.fullSlug)} is ${chalk.green(`PR #${pullReq.number}`)}:`);
    let dateAttr = 'updated_at';
    console.log(this.formatHeading('Date:'), pullReq[dateAttr]);
    console.log(this.formatHeading('Title:'), pullReq.title);
    console.log(this.formatHeading('Submitted by:'), pullReq.user.login);
    // console.log(pullReq);
    this.showDiff(pullReq);
  }

  doStuff() {
    this.findlastGreenPullRequest().then((pullReq) => {
      if (!pullReq) {
        return;
      }
      this.tellAboutPr(pullReq);
      this.confirmMergeWithUser(pullReq).then(() => {
        this.mergePullRequests(pullReq);
      });
    });
  }

  run() {
    this.readConfig();
    this.authenticate();
    this.doStuff();
  }
}
