/* eslint-disable */
let topology = {
  id: 'samGov',
  resources: {
    elasticCloud: {
      init: () => {},
    },
    mongoDb: {
      init: () => {},
    },
  },
  runners: {
    api: {
      run: ({ resources, data }) => {},
    },
    details: {
      run: ({ resources, data }) => {},
      shouldRun: ({ resources, data }) => true, // some logic
      resources: ['elasticCloud', 'mongoDb'],
    },
  },
  dag: {
    api: {
      runner: 'api',
      dependencies: [],
    },
    apiDetails: {
      runner: 'details',
      dependencies: ['api'],
    },
  },
}

interface Topology {
  id: string
}

interface Options {
  includeNodes?: string[]
  excludeNodes?: string[]
  data?: any // Fed into starting nodes (i.e., nodes with no dependencies)
}

const processTopology = (topology: Topology, options: Options) => {}

// Feathers service
/*
POST /topology
{
  id: 'samGov',
  includeNodes: ['api'],
  data: {}
}
GET /topology?id=samGov&status=running
*/

// MongoDB topology collection record
let mongo = {
  topologyId: 'samGov',
  includesNodes: ['api', 'apiDetails'],
  status: 'running',
  runningNodes: ['apiDetails'],
  dag: {
    api: {
      runner: 'api',
      dependencies: [],
    },
    apiDetails: {
      runner: 'details',
      dependencies: ['api'],
    },
  },
  data: {
    api: {
      input: {
        startDate: new Date('2020-01-01'),
        endDate: new Date('2020-01-01'),
      },
      output: ['123', '456'],
    },
    apiDetails: {
      input: ['123', '456'],
    },
  },
}
