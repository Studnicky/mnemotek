#!/usr/bin/env node
import {MnemotekCli} from '@studnicky/mnemotek'
import process from 'node:process'

import {createDepsAuditApp} from '../core/depsAuditApp.js'

const exitCode = await MnemotekCli.execute(createDepsAuditApp())
process.exitCode = exitCode
