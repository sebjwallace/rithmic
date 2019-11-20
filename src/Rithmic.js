const Machine = require('./Machine')
const EventBus = require('./EventBus')
class Rithmic {

  constructor(){
    this.machines = {}
    this.eventBus = new EventBus()
  }

  create(schema){
    const machine = new Machine(schema)
    this.addMachine(machine)
    this.handleMachineMessages(machine)

    return machine
  }

  addMachine(machine){
    if(this.machines[machine.id]){
      throw(`The machine ${machine.id} already exists`)
    }
    else {
      this.machines[machine.id] = machine
    }
    if(machine.schema.messages){
      machine.schema.messages.forEach(message => {
        this.eventBus.subscribe({
          event: message.event,
          subscriber: machine.id,
          callback: machine.receive.bind(machine)
        })
      })
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
    return this
  }

  handleMachineMessages(machine){
    machine.onSend(({ event, payload }) => {
      this.eventBus.publish({ event, payload })
    })
  }

  send(event, payload){
    this.eventBus.publish({event, payload})
    return this
  }

  subscribe(args){
    this.eventBus.subscribe(args)
  }

  reset(){
    this.machines = {}
  }

}

module.exports = new Rithmic()