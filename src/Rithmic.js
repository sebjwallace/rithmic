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
    return this
  }

  handleMachineMessages(machine){
    machine.onSend(({ event, payload }) => {
      this.eventBus.publish({ event, payload })
    })
  }

  reset(){
    this.machines = {}
  }

}

module.exports = new Rithmic()