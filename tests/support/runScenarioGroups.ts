import {it} from 'node:test'

import type {ScenarioNameEntity} from '../entities/ScenarioNameEntity.js'
import type {ScenarioShapeEntity} from '../entities/ScenarioShapeEntity.js'

interface ScenarioCaseInterface {
  readonly name?: ScenarioNameEntity.Type;
  readonly shape?: ScenarioShapeEntity.Type;
}

interface ScenarioGroupOptionsInterface {
  readonly groups: ScenarioGroupsInterface;
  readonly run?: ScenarioRunnerInterface;
  readonly runnerMap?: Record<string, ScenarioRunnerInterface>;
}

interface ScenarioGroupsInterface {
  readonly [group: string]: readonly ScenarioCaseInterface[];
}

interface ScenarioRunnerInterface {
  (scenarioCase: ScenarioCaseInterface): Promise<void> | void;
}

export class RunScenarioGroups {

  public static run (options: ScenarioGroupOptionsInterface): void {

    const run = options.run ?? (async (scenarioCase): Promise<void> => {

      const {shape} = scenarioCase
      const runner = shape === undefined
        ? undefined
        : options.runnerMap?.[shape]

      if (runner === undefined) {

        throw new TypeError(`No scenario runner is registered for "${shape ?? 'undefined'}".`)

      }

      return runner(scenarioCase)

    })

    for (const [
      group,
      scenarios
    ] of Object.entries(options.groups)) {

      for (const scenarioCase of scenarios) {

        void it(
          `${group}: ${scenarioCase.name ?? '<unnamed>'}`,
          async () => {

            await Promise.resolve(run(scenarioCase))

          }
        )

      }

    }

  }

}
