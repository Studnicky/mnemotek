export class RecordGuard {

  public static isRecord (value: unknown): value is Record<string, unknown> {

    return value !== null && typeof value === 'object' && !Array.isArray(value)

  }

}
