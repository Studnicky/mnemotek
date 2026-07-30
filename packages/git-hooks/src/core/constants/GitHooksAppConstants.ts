export const GIT_HOOKS_CONSTANTS = {
  DEFAULT_HOOKS_DIR: '.githooks',
  KNOWN_GIT_HOOK_NAMES: [
    'applypatch-msg',
    'commit-msg',
    'fsmonitor-watchman',
    'post-applypatch',
    'post-checkout',
    'post-commit',
    'post-merge',
    'post-receive',
    'post-rewrite',
    'post-update',
    'pre-applypatch',
    'pre-auto-gc',
    'pre-commit',
    'pre-merge-commit',
    'pre-push',
    'pre-rebase',
    'pre-receive',
    'prepare-commit-msg',
    'push-to-checkout',
    'sendemail-validate',
    'update'
  ]
} as const
