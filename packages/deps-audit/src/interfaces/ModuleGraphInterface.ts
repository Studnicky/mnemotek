export interface ModuleGraphInterface {
  readonly edges: ReadonlyMap<string, readonly string[]>;
  readonly externalSpecifiers: ReadonlySet<string>;
  readonly files: readonly string[];
}
