#!/usr/bin/env node
import {MnemotekCli} from '@studnicky/mnemotek'
import process from 'node:process'

import {LabelsSyncApp} from '../core/labelsSyncApp.js'

const exitCode = await MnemotekCli.execute(LabelsSyncApp.createLabelsSyncApp())
process.exitCode = exitCode
