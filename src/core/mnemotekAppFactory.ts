import type {Mnemotek} from './mnemotek.js'
import type {mnemotekContract} from './mnemotekContract.js'

export class MnemotekAppFactory {

  public static registerCommands (app: Mnemotek, ...commands: mnemotekContract.CommandRegistrationInterface[]): void {

    for (const command of commands) {

      app.command(command)

    }

  }

}
