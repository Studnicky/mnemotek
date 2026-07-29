export const GIT_FLOW_EXPECTED_PATTERNS = {
  INVALID_COMMIT_MESSAGE: /Invalid commit message/u,
  LOCK_CONFLICT: /already running|lock file/u,
  MERGE_CONFLICT: /merge/iu,
  MID_MERGE_OR_REBASE: /mid-merge|mid-rebase/u,
  PULL_CONFLICT: /conflict/u,
  THROWN_BOOM: /boom/u
} as const
