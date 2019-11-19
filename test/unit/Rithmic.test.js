const { expect } = require('chai')
const Rithmic = require('../../src/Rithmic')

const schema = {
  id: 'test',
  states: [
    { id: 'ON' },
    { id: 'OFF', initial: true }
  ],
  transitions: [
    {
      event: 'TOGGLE',
      source: 'OFF',
      target: 'ON'
    },
    {
      event: 'TOGGLE',
      source: 'ON',
      target: 'OFF'
    }
  ]
}

describe('Rithmic', function() {

  beforeEach(() => Rithmic.reset())

  it('should construct machine from schema', function() {
    const machine = Rithmic.create(schema)
    expect(machine.schema).to.deep.eq(schema)
  })

  it('should persist created machines', function() {
    Rithmic.create(schema)
    expect(Rithmic.machines.test.id).to.deep.eq(schema.id)
  })

  it('should send messages between machines', function() {
    const machine1 = Rithmic.create({
      id: 'test1',
      states: [
        { id: 'ON', entry: 'send' },
        { id: 'OFF', initial: true, entry: 'send' }
      ],
      transitions: [
        {
          event: 'TOGGLE',
          source: 'OFF',
          target: 'ON'
        },
        {
          event: 'TOGGLE',
          source: 'ON',
          target: 'OFF'
        }
      ],
      methods: {
        send(){
          return {
            send: {
              event: 'TOGGLE'
            }
          }
        }
      }
    })
    const machine2 = Rithmic.create({
      id: 'test2',
      states: [
        { id: 'ON' },
        { id: 'OFF', initial: true }
      ],
      transitions: [
        {
          event: 'TOGGLE',
          source: 'OFF',
          target: 'ON'
        },
        {
          event: 'TOGGLE',
          source: 'ON',
          target: 'OFF'
        }
      ],
      messages: [
        {
          event: 'TOGGLE',
          receive: 'TOGGLE'
        }
      ]
    })
    expect(machine2.isCurrentState('OFF')).to.eq(true)
    machine1.receive('TOGGLE')
    expect(machine2.isCurrentState('ON')).to.eq(true)
    machine1.receive('TOGGLE')
    expect(machine2.isCurrentState('OFF')).to.eq(true)
  })

})