#!/usr/bin/env node
import {MnemotekCli} from '@studnicky/mnemotek'
import process from 'node:process'

import {ConfigStandardsApp} from '../core/configStandardsApp.js'

const exitCode = await MnemotekCli.execute(ConfigStandardsApp.createConfigStandardsApp())
process.exitCode = exitCode
