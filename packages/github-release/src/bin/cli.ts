#!/usr/bin/env node
import {MnemotekCli} from '@studnicky/mnemotek'
import process from 'node:process'

import {GithubReleaseApp} from '../core/githubReleaseApp.js'

const exitCode = await MnemotekCli.execute(GithubReleaseApp.createGithubReleaseApp())
process.exitCode = exitCode
