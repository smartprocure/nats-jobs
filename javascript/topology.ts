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
  nodes: {
    api: {
      run: ({ resources, data, updateStateFn }) => {},
      resources: []
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

    // input: list of ids
    // output: list of ids
    // artifacts: records in mongo, list of ids
    // state: { cursor: id }
    history: { deps: ['api', 'processFile'] },

    // input: list of ids
    // output: list of ids
    // artifacts: records in mongo
    // state: { cursor: id }
    downloadStuff: { deps: ['api', 'history', 'processFile'] },

    // input: list of ids
    // output: list of ids
    // artifacts: records in mongo
    // state: { cursor: id }
    details: { deps: ['downloadStuff'] },

    // input: list of ids
    // output: list of ids
    // artifacts: records in mongo
    // state: { cursor: id }
    attachments: { deps: ['downloadStuff'] },

    // input: list of ids
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
  id: 'samGov',
  includesNodes: ['api', 'details'],
  status: 'running',
  runningNodes: ['details'],
  dag: {
    api: {
      runner: 'api',
      dependencies: [],
    },
    details: {
      runner: 'details',
      dependencies: ['api'],
    },
    history: {
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
    details: {
      // Input should always be a ref when there is a previous stage with an output
      input: {'$ref': '#/data/api/output'},
      // Output should always be a ref when input === output
      output: {'$ref': '#/data/api/output'},
    },
  },
}
