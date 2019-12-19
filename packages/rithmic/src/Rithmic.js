const EventBus = require('./EventBus')
const MachineFactory = require('./MachineFactory')
const Installer = require('./Installer')
const Tree = require('./Tree')
const WatchMultiplex = require('./WatchMultiplex')
class Rithmic {

  constructor(){
    this.eventBus = new EventBus()
    this.machineFactory = new MachineFactory()
    this.watchMultiplex = new WatchMultiplex()
    this.installer = new Installer({
      eventBus: this.eventBus,
      machineFactory: this.machineFactory,
      watchMultiplex: this.watchMultiplex
    })
    this.tree = new Tree({
      installer: this.installer,
      machineFactory: this.machineFactory,
      eventBus: this.eventBus
    })
    this.request = this.eventBus.publish.bind(this.eventBus)
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
    this.eventBus.publish(events)
    return this
  }

  subscribe(args){
    this.eventBus.subscribe(args)
    return this
  }

  watch(callback){
    this.watchMultiplex.subscribe(callback)
    return this
  }

  getMachine({ tag, id }){
    return this.machineRegistry.get({ id, tag })
  }

}

module.exports = new Rithmic()