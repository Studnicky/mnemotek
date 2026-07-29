import process from 'node:process'

export class PayloadOptions {

  public static resolveRoot (payload: Record<string, unknown>): string {

    return typeof payload.root === 'string'
      ? payload.root
      : process.cwd()

  }

}
