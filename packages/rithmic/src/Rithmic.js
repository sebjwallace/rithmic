const EventBus = require('./EventBus')
const MachineFactory = require('./MachineFactory')
const Installer = require('./Installer')
const Tree = require('./Tree')
class Rithmic {

  constructor(){
    this.eventBus = new EventBus()
    this.machineFactory = new MachineFactory()
    this.installer = new Installer({
      eventBus: this.eventBus,
      machineFactory: this.machineFactory
    })
    this.tree = new Tree({
      installer: this.installer,
      machineFactory: this.machineFactory
    })
  }

  create(schema){
    const machine = this.machineFactory.createAndRegister(schema)
    this.installer.installMachine(machine)
    return machine
  }

  register(schema){
    this.machineFactory.registerSchema(schema)
    return this
  }

  send(events){
    if(!Array.isArray(events)) events = [events]
    events.forEach(event => event && this.eventBus.publish(event))
    return this
  }

  subscribe(args){
    this.eventBus.subscribe(args)
  }

  getMachine({ tag, id }){
    return this.machineRegistry.get({ id, tag })
  }

}

module.exports = new Rithmic()