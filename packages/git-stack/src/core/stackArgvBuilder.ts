export class StackArgvBuilder {

  public static buildArgv (input: {readonly action: string;
    readonly argumentList?: readonly string[];}): string[] {

    const result = StackArgvBuilder.toArgumentList(
      'stack',
      input.action,
      ...input.argumentList ?? []
    )
    return result

  }

  private static toArgumentList (...parts: string[]): string[] {

    const result = parts
    return result

  }

}
