import {it} from 'node:test'

interface ScenarioCaseInterface {
  readonly name?: string;
  readonly shape?: string;
}

interface ScenarioGroupOptionsInterface {
  readonly groups: ScenarioGroupsInterface;
  readonly run?: ScenarioRunnerInterface;
  readonly runnerMap?: Record<string, ScenarioRunnerInterface>;
}

type ScenarioGroupsInterface = Readonly<Record<string, readonly ScenarioCaseInterface[]>>

type ScenarioRunnerInterface = (scenarioCase: ScenarioCaseInterface) => Promise<void> | void

export class RunScenarioGroups {

  public static run (options: ScenarioGroupOptionsInterface): void {

    const run = options.run ?? (async (scenarioCase) => {

      const {shape} = scenarioCase
      const runner = shape === undefined
        ? undefined
        : options.runnerMap?.[scenarioCase.shape ?? '']

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
          `${group}: ${scenarioCase.name}`,
          async () => {

            await Promise.resolve(run(scenarioCase))

          }
        )

      }

    }

  }

}
