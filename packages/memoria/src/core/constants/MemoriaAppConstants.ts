export const MEMORIA_APP_SCHEMA = {
  HOST_OPTION: {
    description: 'Override the current hostname used for host-scoped entry filtering.',
    type: 'string'
  },
  MANIFEST_OPTION: {
    description: 'Path to the manifest file. Defaults to ./memoria.manifest.json.',
    type: 'string'
  },
  OS_OPTION: {
    description: 'Override the current platform (os.platform() value) used for os-scoped entry filtering.',
    type: 'string'
  }
} as const
