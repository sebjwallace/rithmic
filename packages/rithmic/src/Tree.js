const Registry = require('./Registry')

module.exports = class Tree {

  constructor({
    installer,
    machineFactory
  }){

    this.installer = installer
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

    const traverse = (node, parent) => {
      const { schema, children = [] } = node
      const machine = this.machineFactory.create({ schema })
      const obj = { machine, definition: node }
      this.installer.installMachine(machine)
      const childMachines = children.map(child => traverse(child, obj))
      if(node.create){
        parent.machine.onSend(({ event, payload }) => {
          if(event === node.create){
            const child = traverse(node, parent)
            parent.children.push(child)
            child.machine.callConstructor(payload)
          }
        })
      }
      if(node.delete){
        // delete machine and remove from parent array
      }
      obj.children = childMachines
      return obj
    }
    
    const { root } = this.treeRegistry.get({ id: treeId })
    this.tree = traverse(root)

    return this.tree

  }

  createObjectTree(){

    const traverse = ({ machine, children, definition }) => {

      const childrenObject = children.reduce((accum, child, i) => {
        const { schema, alias, array } = definition.children[i]
        child = traverse(child)
        return {
          ...accum,
          [alias || schema]: array ? [child] : child
        }
      }, {})

      return {
        data: machine.data,
        state: machine.getStates(),
        children: childrenObject
      }
    }

    return traverse(this.tree)

  }

}