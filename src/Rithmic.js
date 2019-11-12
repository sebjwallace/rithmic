
class Rithmic {

  constructor(){

    this.machines = {}
    this.tags = {}

  }

  create(schema){

    const machine = new Machine(schema)
    this.addMachine(machine)
    this.assignMachineTags(machine)
    this.handleMachineMessages(machine)

  }

  addMachine(machine){
    if(this.machines[machine.id]){
      throw(`The machine ${machine.id} already exists`)
    }
    else {
      this.machines[machine.id] = machine
    }
    return this
  }

  assignMachineTags(machine){
    const { schema } = machine

    if(!schema.tags) return this

    if(!Array.isArray(schema.tags)){
      throw(`Machine schema tags for ${machine.id} needs to be an array`)
    }

    schema.tags.forEach(tag => {
      if(!this.tags[tag]){
        this.tags[tag] = []
      }
      this.tags[tag].push(machine)
    })
  }

  handleMachineMessages(machine){
    machine.onSend(({ target, event, payload }) => {
      const { ids = [], tags = [] } = target

      ids.forEach(id => {
        try {
          machines[id].receive(event, payload)
        } catch(e) {
          throw(`Cannot send message to machine ${id} as it does not exist`)
        }
      })

      tags.forEach(tag => {
        try {
          machines.tags[tag].forEach(machine => {
            machine.receive(event, payload)
          })
        } catch(e) {
          throw(`Cannot send message to machines with tag ${tag}
          as no machines are assigned with that tag`)
        }
      })
    })
  }

}