import type {ScenarioMapInterface} from '../../interfaces/ScenarioMapInterface.js'

import scenarioGroupsData from '../mnemotek.scenarios.json' with {type: 'json'}

export const scenarioGroups = scenarioGroupsData as ScenarioMapInterface
