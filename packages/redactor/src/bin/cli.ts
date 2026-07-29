#!/usr/bin/env node
import {MnemotekCli} from '@studnicky/mnemotek'
import process from 'node:process'

import {RedactorApp} from '../core/redactorApp.js'

const exitCode = await MnemotekCli.execute(RedactorApp.createRedactorApp())
process.exitCode = exitCode
