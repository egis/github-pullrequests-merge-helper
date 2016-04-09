# github-pullrequests-merge-helper

[![NPM info][nodei.co]][npm-url]

[![Circle CI](https://circleci.com/gh/artemv/github-pullrequests-merge-helper.svg?style=shield)](https://circleci.com/gh/artemv/github-pullrequests-merge-helper)
[![Code Climate](https://codeclimate.com/github/artemv/github-pullrequests-merge-helper/badges/gpa.svg)](https://codeclimate.com/github/artemv/github-pullrequests-merge-helper)
[![Dependency Status](https://david-dm.org/artemv/github-pullrequests-merge-helper.svg)](https://david-dm.org/artemv/github-pullrequests-merge-helper)
[![devDependency Status](https://david-dm.org/artemv/github-pullrequests-merge-helper/dev-status.svg)](https://david-dm.org/artemv/github-pullrequests-merge-helper#info=devDependencies)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## Overview

![Example screenshot](http://content.screencast.com/users/artemv/folders/Jing/media/9687b231-5dda-436f-84c3-ee7b54a01933/00000615.png "Example screenshot")

This module is a CLI tool that
* search for a last green (re CI) pull request having specfied pattern in its title for a given repo
* show its diff and ask user confirmation to merge it
* merge the pull request

This module plays perfectly to merge pull requests created by
[semantic-dependents-updates-github](https://github.com/egis/semantic-dependents-updates-github) or
[Greenkeeper](https://greenkeeper.io) - that's why we wanted to create it in first place.

## Installation
Install the package:
```
npm install -g @egis/github-pullrequests-merge-helper
```

## Usage

* Create a GitHub token to be used by github-pullrequests-merge-helper and put it to GH_TOKEN env variable.
You can also take (any of) GH_TOKEN created by https://github.com/semantic-release/semantic-release setup: it will
print it if you choose 'Other' CI instead of Travis.

* Run it:
```
  github-pullrequests-merge-helper git@github.com:artemv/generator-ruby-starter-kit.git --pattern="Update\s.+\sto\sversion" --ci-context="continuous-integration"
```
Here, ci-context is for Travis. Default is 'ci', that's for CircleCI. Pattern param is optional.

## Limitations
It only shows diff for single file from single commit of the PR - just enough for semantic-dependents-updates-github and Greenkeeper use cases.

## License

MIT License 2016 © Artem Vasiliev


[nodei.co]: https://nodei.co/npm/@egis/github-pullrequests-merge-helper.png
[npm-url]: https://npmjs.org/package/@egis/github-pullrequests-merge-helper
