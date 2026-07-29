#!/usr/bin/env node
import {MnemotekCli} from '@studnicky/mnemotek'
import process from 'node:process'

import {InspectApp} from '../core/inspectApp.js'

const exitCode = await MnemotekCli.execute(InspectApp.createInspectApp())
process.exitCode = exitCode
