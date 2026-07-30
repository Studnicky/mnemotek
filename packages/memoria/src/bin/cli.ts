#!/usr/bin/env node
import {MnemotekCli} from '@studnicky/mnemotek'
import process from 'node:process'

import {MemoriaApp} from '../core/memoriaApp.js'

const exitCode = await MnemotekCli.execute(MemoriaApp.createMemoriaApp())
process.exitCode = exitCode
