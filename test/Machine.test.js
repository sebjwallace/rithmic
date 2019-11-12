const { expect } = require('chai')
const Machine = require('../src/Machine')

function createBasicMachine(){
  const schema = {
    id: 'test',
    states: [
      { id: 'OFF', initial: true },
      { id: 'ON' }
    ],
    transitions: [
      { source: 'ON', target: 'OFF', event: 'SWITCH' }
    ]
  }
  return {
    schema,
    machine: new Machine(schema)
  }
}

describe('Machine', function() {

  it('should construct from basic schema', function() {
    const { machine, schema } = createBasicMachine()
    expect(machine.schema).to.deep.eq(schema)
  })

  it('should be in initial state', function() {
    const { machine, schema } = createBasicMachine()
    expect(machine.state).to.deep.eq(schema.states[0])
  })

})