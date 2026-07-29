import type {ScenarioDataEntity} from '../entities/ScenarioDataEntity.js'
import type {ScenarioShapeEntity} from '../entities/ScenarioShapeEntity.js'

export interface ScenarioCaseInterface {
  readonly expected?: ScenarioDataEntity.Type;
  readonly input?: ScenarioDataEntity.Type;
  readonly shape?: ScenarioShapeEntity.Type;
}
