#!/usr/bin/env node
import {MnemotekCli} from '@studnicky/mnemotek'
import process from 'node:process'

import {createInspectApp} from '../core/inspectApp.js'

const exitCode = await MnemotekCli.execute(createInspectApp())
process.exitCode = exitCode
