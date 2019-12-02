const Machine = require('./Machine')
const EventBus = require('./EventBus')
const Util = require('./Util')
const MachineFactory = require('./MachineFactory')
const Tree = require('./Tree')
class Rithmic {

  constructor(){
    this.eventBus = new EventBus()
    this.machineFactory = new MachineFactory()
    this.tree = new Tree({ machineFactory: this.machineFactory })
  }

  create(schema, constructorPayload){
    const machine = this.machineFactory.createAndRegister(schema)
    this.addMachine(machine, constructorPayload)
    return machine
  }

  register(schema){
    this.machineFactory.registerSchema(schema)
    this.handleLifecycles(schema)
    return this
  }

  addMachine(machine, constructorPayload){
    machine.onDelete(() => this.removeMachine(machine))
    this.handleMachineSubscriptions(machine)
    this.handleMachineMessages(machine)
    this.handleChildrenRequests(machine)
    machine.callConstructor(constructorPayload)
    return this
  }

  removeMachine(machine){
    this.eventBus.unsubscribe({ subscriber: machine.id })
    this.machineFactory.removeMachine(machine)
    return this
  }

  handleMachineSubscriptions(machine){
    const { subscriptions, transitions } = machine.schema
    if(subscriptions){
      subscriptions.forEach(({ create, event, method }) => {
        if(create) return
        this.eventBus.subscribe({
          event,
          subscriber: machine.id,
          callback: ({ event, payload }) => {
            machine.callMethod(method, event, payload)
          }
        })
      })
    }
    if(transitions){
      transitions.forEach(({ event }) => {
        this.eventBus.subscribe({
          event,
          subscriber: machine.id,
          callback: machine.receive.bind(machine),
          disableDuplicateEventSubscriber: true
        })
      })
    }
  }

  handleMachineMessages(machine){
    machine.onSend(({ event, payload }) => {
      this.eventBus.publish({ event, payload })
    })
  }

  handleChildrenRequests(machine){
    machine.onCreateChildRequest(({ id, schema, payload }) => {
      const childMachine = this.create({ schema }, payload)
      machine.addChildReference({ id, machine: childMachine })
    })
  }

  handleLifecycles(schema){
    const { subscriptions } = schema
    if(!subscriptions) return
    subscriptions.forEach(({ create, event, method }) => {
      if(!create) return
      this.eventBus.subscribe({
        event: event,
        subscriber: schema.id,
        callback: ({ event, payload }) => {
          const machine = new Machine(schema)
          machine.id = Util.Uniquify(machine.id)
          this.addMachine(machine)
          machine.callMethod(method, event, payload)
        }
      })
    })
  }

  send(events){
    if(!Array.isArray(events)) events = [events]
    events.forEach(event => event && this.eventBus.publish(event))
    return this
  }

  subscribe(args){
    this.eventBus.subscribe(args)
  }

  useMachine({ tag, id }){
    return this.machineRegistry.get({ id, tag })
  }

}

module.exports = new Rithmic()