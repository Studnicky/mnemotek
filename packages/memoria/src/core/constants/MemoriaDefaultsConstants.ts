export const MEMORIA_DEFAULTS = {
  BOOTSTRAP_CLONE_TIMEOUT_MS: 30000,
  DEFAULT_MANIFEST_PATH: './memoria.manifest.json',
  DEFAULT_RC_FILES: [
    '~/.bashrc',
    '~/.profile',
    '~/.zshrc'
  ],
  LOCK_FILE_NAME: '.memoria.lock',
  SCAN_CANDIDATES: [
    '.bashrc',
    '.gitconfig',
    '.gitignore_global',
    '.tmux.conf',
    '.vimrc',
    '.zshrc'
  ]
} as const
