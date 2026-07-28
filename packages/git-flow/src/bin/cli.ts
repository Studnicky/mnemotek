#!/usr/bin/env node
import {MnemotekCli} from '@studnicky/mnemotek'
import process from 'node:process'

import {createGitFlowApp} from '../core/gitFlowApp.js'

const exitCode = await MnemotekCli.execute(createGitFlowApp())
process.exitCode = exitCode
