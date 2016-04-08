import * as fs from 'fs';
import * as github from 'github';
import * as parseGithubUrl from '@bahmutov/parse-github-repo-url';

import minimist from 'minimist';
import chalk from 'chalk';
import inquirer from 'inquirer';
import pluralize from 'pluralize';

const env = process.env;
const GitHubApi = github.default;
const parseSlug = parseGithubUrl.default;

const GH_TOKEN_KEY = 'GH_TOKEN';

export default class GithubMergeHelper {
  readConfig() {
    let argv = minimist(process.argv.slice(2));
    let repoArg = argv._[0];
    this.pattern = argv.pattern;
    this.debugMode = argv.debug;
    this.ciContext = argv['ci-context'] || 'ci'; // 'ci' is what CircleCI uses. Specify --ci-context="continuous-integration" for Travis.
    if (!repoArg) {
      throw 'Usage: github-pullrequests-merge-helper git@github.com:artemv/github-pullrequests-merge-helper.git --pattern="Update\\s.+\\sto\\sversion" --ci-context="continuous-integration"';
    }
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
    console.log('Retrieving the pull requests..');
    return new Promise((resolve) => {
      let msg = {
        state: 'open',
        base: this.branch,
        sort: 'created',
        direction: 'desc'
      };
      if (this.debugMode) {
        console.log('Debug mode: searching for closed PRs, too');
        msg.state = 'all';
      }
      this.githubApi.pullRequests.getAll(Object.assign(this.gitRepoOptions(), msg), (err, data) => {
        if (err) {
          throw new Error(`Couldn't get open PRs list for ${this.fullSlug}: ${err}`);
        }
        console.log(`${pluralize('pull request', data.length, true)} found`);
        resolve(data);
      });
    });
  }

  tooBad(caption, resolve) {
    console.log(this.formatNotice(caption));
    resolve();
  }

  filterByPattern(list) {
    if (!this.pattern) {
      return list;
    }
    let result = list.filter((item) => item.title.match(this.pattern));
    if (result.length == list.length) {
      console.log(`All pull requests matched the pattern`);
    } else {
      console.log(`${pluralize('pull request', result.length, true)} matched the pattern`);
    }
    return result;
  }

  greenStatus(statusesData) {
    return statusesData.statuses.find((statusData) => {
      return statusData.state == 'success' && statusData.context.startsWith(this.ciContext);
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
      console.log(`Searching for the last green request..`);
      // need to get statuses for all the PRs here because it's async and we can first get response for not the latests PR
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

  showDiff(commitData) {
    console.log('Diff:', commitData.files[0].patch);
  }

  confirmMergeWithUser(pullReq) {
    return new Promise((resolve, reject) => {
      inquirer.prompt([{name: 'merge', type: 'confirm', message: 'Do you want to merge it?'}], ({merge: confirm}) => {
        confirm ? resolve() : reject();
      });
    });
  }

  mergePullRequest(pullReq) {
    console.log('Merging..');
    return new Promise((resolve) => {
      let msg = {
        number: pullReq.number
      };
      this.githubApi.pullRequests.merge(Object.assign(this.gitRepoOptions(), msg), (err, data) => {
        if (err) {
          throw new Error(`Couldn't merge the PR #${pullReq.number}: ${err}`);
        }
        console.log(chalk.green('Merged successfully!'));
        resolve();
      });
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
    console.log(`Approved by ${chalk.green(ci)} at`, chalk.green(status[updatedAtAttr]));
    this.showDiff(commitData);
  }

  fetchCommitData(sha) {
    console.log('Fetching the commit data..');
    return new Promise((resolve) => {
      let msg = {
        sha: sha,
        'Content-Type': 'application/vnd.github.VERSION.diff'
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
      this.mergePullRequest(pullReq);
    });
  }

  run() {
    this.readConfig();
    this.authenticate();
    this.doStuff();
  }
}
