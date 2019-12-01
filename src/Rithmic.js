const Machine = require('./Machine')
const EventBus = require('./EventBus')
const Registry = require('./Registry')
const Util = require('./Util')
class Rithmic {

  constructor(){
    this.eventBus = new EventBus()
    this.machineRegistry = new Registry()
    this.schemaRegistry = new Registry()
  }

  create(schema, constructorPayload){
    let machine
    const fromRegisteredSchema = schema.schema || typeof schema === 'string'
    if(fromRegisteredSchema){
      machine = new Machine(this.schemaRegistry.get({ id: schema.schema || schema }))
      if(schema.schema && schema.data){
        machine.data = { ...machine.data, ...schema.data }
      }
      machine.id = Util.Uniquify(machine.id)
    }
    else {
      machine = new Machine(schema)
    }
    this.addMachine(machine, constructorPayload)
    return machine
  }

  register(schema){
    this.schemaRegistry.register({
      item: schema,
      id: schema.id,
      tags: schema.tags
    })
    this.handleLifecycles(schema)
    return this
  }

  addMachine(machine, constructorPayload){
    this.machineRegistry.register({
      item: machine,
      id: machine.id,
      tags: machine.tags
    })
    machine.onAddTag(tag => this.machineRegistry.bindTag({
      item: machine,
      id: machine,
      tag
    }))
    machine.onDelete(() => this.removeMachine(machine))
    
    this.handleMachineSubscriptions(machine)
    this.handleMachineMessages(machine)
    this.handleChildrenRequests(machine)
    machine.callConstructor(constructorPayload)
    return this
  }

  removeMachine(machine){
    this.eventBus.unsubscribe({ subscriber: machine.id })
    this.machineRegistry.remove(machine.id)
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

  getObjectTree(rootMachine){
    const traverse = machine => {
      const childKeys = Object.keys(machine.childRefs)
      const children = childKeys.reduce((accum, key) => {
        const child = machine.childRefs[key]
        if(!child) return accum
        const isArray = Array.isArray(child)
        return {
          ...accum,
          [key]: isArray ? child.map(traverse) : child
        }
      }, {})
      return {
        data: machine.data,
        states: machine.getStates(),
        children
      }
    }
    return traverse(rootMachine)
  }

}

module.exports = new Rithmic()