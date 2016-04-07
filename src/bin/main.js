#!/usr/bin/env node

import 'babel-polyfill';

import GithubMergeHelper from '../GithubMergeHelper';

new GithubMergeHelper().run();
