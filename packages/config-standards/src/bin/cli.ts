#!/usr/bin/env node
import {MnemotekCli} from '@studnicky/mnemotek'
import process from 'node:process'

import {createConfigStandardsApp} from '../core/configStandardsApp.js'

const exitCode = await MnemotekCli.execute(createConfigStandardsApp())
process.exitCode = exitCode
