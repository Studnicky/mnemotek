#!/usr/bin/env node
import {MnemotekCli} from '@studnicky/mnemotek'
import process from 'node:process'

import {createRedactorApp} from '../core/redactorApp.js'

const exitCode = await MnemotekCli.execute(createRedactorApp())
process.exitCode = exitCode
