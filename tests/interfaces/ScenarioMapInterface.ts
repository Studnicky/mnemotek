import type {ScenarioCaseInterface} from './ScenarioCaseInterface.js'

export interface ScenarioMapInterface {
  readonly [group: string]: readonly ScenarioCaseInterface[];
}
