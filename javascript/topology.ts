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
    // input: path, storage type (gcs, filesystem)
    // output: list of paths
    // artifacts: files in the storage
    downloadFiles: { deps: [] },

    // input: path, storage type (gcs, filesystem)
    // output: mongo id pointing to the artifact
    // artifacts: list of ids (size of 400k)
    processFile: { deps: ['downloadFiles'] },

    // input: start,end
    // output: list of ids
    // artifacts: records in mongo
    api: { deps: [] },

    // input: mongo id
    // output: mongo id
    // artifacts: records in mongo, list of ids
    // state: { cursor: id }
    history: { deps: ['api', 'processFile'] },

    // input: mongo id
    // output: mongo id
    // artifacts: records in mongo
    // state: { cursor: id }
    downloadStuff: { deps: ['api', 'history', 'processFile'] },

    // input: mongo id
    // output: mongo id
    // artifacts: records in mongo
    // state: { cursor: id }
    details: { deps: ['downloadStuff'] },

    // input: mongo id
    // output: mongo id
    // artifacts: records in mongo
    // state: { cursor: id }
    attachments: { deps: ['downloadStuff'] },

    // input: mongo id
    // artifacts: records in mongo
    // state: { cursor: id }
    mongo: { deps: ['details', 'attachments'] },
  },
}

// pseudo-code: difference(list of this topology ids, list of ids processed ever for this particular job)

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
