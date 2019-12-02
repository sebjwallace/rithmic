const Machine = require('./Machine')
const Registry = require('./Registry')
const Util = require('./Util')

module.exports = class MachineFactory {

  constructor(){
    this.machineRegistry = new Registry()
    this.schemaRegistry = new Registry()
  }

  registerSchema(schema){
    this.schemaRegistry.register({
      item: schema,
      id: schema.id,
      tags: schema.tags
    })
    return this
  }

  createFromSchema(schema){
    return new Machine(schema)
  }

  createFromRegistry(schemaId){
    const schema = this.schemaRegistry.get({ id: schemaId })
    const machine = new Machine(schema)
    machine.data = { ...machine.data, ...schema.data }
    machine.id = Util.Uniquify(machine.id)
    return machine
  }

  create(schema){
    const schemaName = typeof schema === 'string' ? schema : schema.schema
    return schemaName
      ? this.createFromRegistry(schemaName)
      : this.createFromSchema(schema)
  }

  createAndRegister(schema){
    const machine = this.create(schema)
    this.machineRegistry.register({
      item: machine,
      id: machine.id,
      tags: machine.tags
    })
    return machine
  }

  removeMachine(machine){
    this.machineRegistry.remove(machine.id)
    return this
  }

}