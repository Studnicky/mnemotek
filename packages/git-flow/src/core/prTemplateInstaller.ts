import {existsSync, mkdirSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'

import {PR_TEMPLATE} from './constants/PrTemplateConstants.js'

export class PrTemplateInstaller {

  public static ensureTemplate (root: string): void {

    const hasExistingTemplate = PR_TEMPLATE.KNOWN_LOCATIONS.some((location) => {

      const exists = existsSync(join(
        root,
        location
      ))
      return exists

    })

    if (hasExistingTemplate) {

      return

    }

    const templatePath = join(
      root,
      PR_TEMPLATE.RELATIVE_PATH
    )

    mkdirSync(
      dirname(templatePath),
      {recursive: true}
    )
    writeFileSync(
      templatePath,
      PR_TEMPLATE.DEFAULT_CONTENT
    )

  }

}
