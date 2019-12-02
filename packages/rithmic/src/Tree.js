const Registry = require('./Registry')

module.exports = class Tree {

  constructor({ machineFactory }){

    this.machineFactory = machineFactory
    this.treeRegistry = new Registry()
    this.tree = null

  }

  register(tree){

    this.treeRegistry.register({
      id: tree.id,
      item: tree
    })

  }

  createMachineTree(treeId){

    const traverse = tree => {
      const { schema, children = [] } = tree
      const machine = this.machineFactory.create({ schema })
      const childMachines = children.map(traverse)
      return {
        machine,
        children: childMachines,
        tree
      }
    }
    
    const { root } = this.treeRegistry.get({ id: treeId })
    this.tree = traverse(root)

    return this.tree

  }

  createObjectTree(){

    const traverse = ({ machine, children }) => {
      return {
        data: machine.data,
        state: machine.getStates(),
        children: children.map(traverse)
      }
    }

    return traverse(this.tree)

  }

}