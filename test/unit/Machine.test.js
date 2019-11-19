const { expect } = require('chai')
const Machine = require('../../src/Machine')

function createBasicMachine(){
  const schema = {
    id: 'test',
    data: {},
    states: [
      {
        id: 'OFF',
        exit: 'test4',
        initial: true
      },
      {
        id: 'ON',
        entry: 'test3'
      }
    ],
    transitions: [
      {
        source: 'OFF',
        target: 'ON',
        event: 'SWITCH',
        method: 'test1'
      },
      {
        source: 'ON',
        target: 'OFF',
        event: 'SWITCH',
        method: 'test2'
      }
    ],
    methods: {
      test1({ data }){
        return {
          data: {
            ...data,
            test1: true
          }
        }
      },
      test2({ data }){
        return {
          data: {
            ...data,
            test2: true
          }
        }
      },
      test3({ data }){
        return {
          data: {
            ...data,
            test3: true
          }
        }
      },
      test4({ data }){
        return {
          data: {
            ...data,
            test4: true
          }
        }
      }
    }
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

  it('should transition to another state', function() {
    const { machine, schema } = createBasicMachine()
    machine.receive('SWITCH')
    expect(machine.state).to.deep.eq(schema.states[1])
    machine.receive('SWITCH')
    expect(machine.state).to.deep.eq(schema.states[0])
  })

  it('should trigger a method on transition', function() {
    const { machine } = createBasicMachine()
    machine.receive('SWITCH')
    expect(machine.data.test1).to.eq(true)
    machine.receive('SWITCH')
    expect(machine.data.test2).to.eq(true)
  })

  it('should trigger a method on state entry', function() {
    const { machine } = createBasicMachine()
    machine.receive('SWITCH')
    expect(machine.data.test3).to.eq(true)
  })

  it('should trigger a method on state exit', function() {
    const { machine } = createBasicMachine()
    machine.receive('SWITCH')
    expect(machine.data.test4).to.eq(true)
  })

})