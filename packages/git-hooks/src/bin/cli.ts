#!/usr/bin/env node
import {MnemotekCli} from '@studnicky/mnemotek'
import process from 'node:process'

import {GitHooksApp} from '../core/gitHooksApp.js'

const exitCode = await MnemotekCli.execute(GitHooksApp.createGitHooksApp())
process.exitCode = exitCode
