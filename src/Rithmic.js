const Machine = require('./Machine')
const EventBus = require('./EventBus')
class Rithmic {

  constructor(){
    this.machines = {}
    this.schemas = {}
    this.refs = {}
    this.eventBus = new EventBus()
  }

  create(schema){
    let machine
    if(typeof schema === 'string'){
      machine = new Machine(this.schemas[schema])
    }
    else {
      machine = new Machine(schema)
    }
    this.addMachine(machine)
    return machine
  }

  register(schema){
    if(this.schemas[schema.id]) return this
    this.schemas[schema.id] = schema
    this.handleLifecycles(schema)
    return this
  }

  addMachine(machine){
    if(this.machines[machine.id]){
      throw(`The machine ${machine.id} already exists`)
    }
    else {
      this.machines[machine.id] = machine
    }
    if(machine.schema.subscriptions){
      machine.schema.subscriptions.forEach(subscription => {
        this.eventBus.subscribe({
          event: subscription.event,
          subscriber: machine.id,
          callback: ({ event, payload }) => {
            machine.callMethod(subscription.method, event, payload)
          }
        })
      })
    }
    if(machine.schema.transitions){
      machine.schema.transitions.forEach(transition => {
        this.eventBus.subscribe({
          event: transition.event,
          subscriber: machine.id,
          callback: machine.receive.bind(machine),
          disableDuplicateEventSubscriber: true
        })
      })
    }
    this.handleMachineMessages(machine)
    return this
  }

  removeMachine(machine){
    this.eventBus.unsubscribe({ subscriber: machine.id })
    delete this.machines[machine.id]
    return this
  }

  handleMachineMessages(machine){
    machine.onSend(({ event, payload }) => {
      this.eventBus.publish({ event, payload })
    })
  }

  handleLifecycles(schema){
    const random = Math.random().toString(36).substring(2)
    const machineId = `${schema.id}_${random}`
    const subscriptions = schema.subscriptions
    if(subscriptions){
      subscriptions.forEach(subscription => {
        if(subscription.create){
          this.eventBus.subscribe({
            event: subscription.event,
            subscriber: schema.id,
            callback: ({ event, payload }) => {
              const machine = new Machine(schema)
              machine.id = machineId
              this.addMachine(machine)
              machine.callMethod(subscription.method, event, payload)
            }
          })
        }
      })
    }
  }

  send(event, payload){
    this.eventBus.publish({event, payload})
    return this
  }

  subscribe(args){
    this.eventBus.subscribe(args)
  }

  useMachine({ ref, id }){
    if(this.machines[id]) return this.machines[id]
    if(this.refs[ref]) return this.refs[ref]
    for(let key in this.machines){
      const machine = this.machines[key]
      if(machine.ref === ref){
        this.refs[ref] = machine
        return machine
      }
    }
  }

  reset(){
    this.machines = {}
  }

}

module.exports = new Rithmic()