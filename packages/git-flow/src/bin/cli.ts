#!/usr/bin/env node
import {MnemotekCli} from '@studnicky/mnemotek'
import process from 'node:process'

import {GitFlowApp} from '../core/gitFlowApp.js'

const exitCode = await MnemotekCli.execute(GitFlowApp.createGitFlowApp())
process.exitCode = exitCode
