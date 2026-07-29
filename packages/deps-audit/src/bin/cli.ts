#!/usr/bin/env node
import {MnemotekCli} from '@studnicky/mnemotek'
import process from 'node:process'

import {DepsAuditApp} from '../core/depsAuditApp.js'

const exitCode = await MnemotekCli.execute(DepsAuditApp.createDepsAuditApp())
process.exitCode = exitCode
