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

  tooBad(caption, resolve) {
    console.log(this.formatNotice(caption));
    resolve();
  }

  filterByPattern(list) {
    return list.filter((item) => item.title.match(this.pattern));
  }

  greenStatus(statusesData) {
    return statusesData.statuses.find((statusData) => {
      return statusData.state == 'success' && statusData.context.startsWith('continuous-integration');
    });
  }

  promiseToGetStatuses(req) {
    return new Promise((resolve) => {
      let msg = { sha: this.reqHeadSha(req) };
      this.githubApi.statuses.getCombined(Object.assign(this.gitRepoOptions(), msg), (err, data) => {
        if (err) {
          throw new Error(`Couldn't get status for PR ${msg}: ${err}`);
        }
        let greenStatus = this.greenStatus(data);
        if (greenStatus) {
          resolve([req, greenStatus]);
        } else {
          resolve(null);
        }
      });
    });
  }

  findGreenFromList(list) {
    return new Promise((resolve) => {
      Promise.all(list.map(this.promiseToGetStatuses.bind(this))).then((reqs) => {
        let greenData = reqs.find((item) => !!item);
        resolve(greenData);
      });
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
        this.findGreenFromList(list).then((greenReqData) => {
          if (!greenReqData) {
            return this.tooBad(chalk.red(`No green pull requests found for given pattern at ${this.fullSlug}.`), resolve);
          }
          resolve(greenReqData);
        });
      });
    });
  }

  showDiff(pullReq) {
    //TODO implement me
  }

  confirmMergeWithUser(pullReq) {
    return new Promise((resolve) => {
      //TODO implement me
      console.log('[gonna ask user here]');
      resolve();
    });
  }

  mergePullRequests(pullReq) {
    return new Promise((resolve) => {
      //TODO implement me
      console.log(chalk.green('Merged successfully!'));
      resolve();
    });
  }

  formatValue(string) {
    return chalk.yellow(string);
  }

  formatNotice(string) {
    return chalk.yellow(string);
  }

  tellAboutPr(pullReq, status, commitData) {
    console.log(`The last ${chalk.green('green')} pull request on ${this.formatValue(this.fullSlug)} is ${this.formatValue(`PR #${pullReq.number}`)}:`);
    let createdAtAttr = 'created_at';
    let updatedAtAttr = 'updated_at';
    console.log('Title:', this.formatValue(pullReq.title));
    console.log(`Submitted by ${this.formatValue(commitData.commit.committer.name)} on behalf of ${this.formatValue(commitData.commit.author.name)} at ${this.formatValue(pullReq[createdAtAttr])}`);
    let ci = status.context.split('/')[1];
    console.log(`Checked by ${chalk.green(ci)} at:`, chalk.green(status[updatedAtAttr]));
    this.showDiff(pullReq);
  }

  fetchCommitData(sha) {
    return new Promise((resolve) => {
      let msg = {
        sha: sha
      };
      this.githubApi.repos.getCommit(Object.assign(this.gitRepoOptions(), msg), (err, data) => {
        if (err) {
          throw new Error(`Couldn't get commit info for ${sha}: ${err}`);
        }
        resolve(data);
      });
    });
  }

  reqHeadSha(pullReq) {
    return pullReq.head.sha;
  }

  doStuff() {
    let pullReq;
    let status;
    this.findlastGreenPullRequest().then((pullReqData) => {
      if (!pullReqData) {
        return;
      }
      [pullReq, status] = pullReqData;
      return this.fetchCommitData(this.reqHeadSha(pullReq));
    }).then((commitData) => {
      this.tellAboutPr(pullReq, status, commitData);
      return this.confirmMergeWithUser(pullReq);
    }).then(() => {
      this.mergePullRequests(pullReq);
    });
  }

  run() {
    this.readConfig();
    this.authenticate();
    this.doStuff();
  }
}
