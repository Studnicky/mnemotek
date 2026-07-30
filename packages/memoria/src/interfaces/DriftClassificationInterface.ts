export interface DriftClassificationInterface {
  readonly managed: readonly string[];
  readonly missing: readonly string[];
  readonly modified: readonly string[];
}
