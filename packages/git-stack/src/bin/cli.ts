#!/usr/bin/env node
import {MnemotekCli} from '@studnicky/mnemotek'
import process from 'node:process'

import {GitStackApp} from '../core/gitStackApp.js'

const exitCode = await MnemotekCli.execute(GitStackApp.createGitStackApp())
process.exitCode = exitCode
