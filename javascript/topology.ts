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
      run: ({ resources, data, updateStateFn }) => {},
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

download -> process
{date: '2021-01-03', data:...}
{date: '2021-01-04', data:...}
...
{date: '2021-12-31', data:...}

{
  startDate: '2021-01-01',
  endDate: '2021-12-31'
}



// MongoDB topology collection record
let mongo = {
  topologyId: 'samGov',
  includesNodes: ['apiDetails', 'whateverDetails'],
  status: 'running',
  runningNodes: ['api'],
  dag: {
    api: {
      runner: 'api',
      dependencies: [],
    },
    apiDetails: {
      runner: 'details',
      dependencies: ['api'],
    },
    whateverDetails: {
      runner: 'details',
      dependencies: ['api'],
    },
  },
  state: {
    api: {
      date: '2020-04-01',
      id: '123'
    }
  },
  data: {
    api: {
      input: {
        startDate: '2020-01-01',
        endDate: '2020-12-31',
      },
      output: ['123', '456'],
    },
    apiDetails: {
      input: ['123', '456'],
    },
  },
}
