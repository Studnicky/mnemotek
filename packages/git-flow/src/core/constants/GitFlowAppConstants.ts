export const GIT_FLOW_APP_SCHEMA = {
  PROJECT_ROOT_OPTION: {
    description: 'Project root containing package.json.',
    type: 'string'
  },
  REPOSITORY_OPTION: {
    description: 'owner/repository. Defaults to the current repository.',
    type: 'string'
  }
} as const
