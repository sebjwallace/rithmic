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
      this.installer.installMachine(machine)
      const childMachines = children.map(child => traverse(child, machine))
      if(node.event){
        parent.onSend(({ event, payload }) => {
          console.log(event, payload)
          if(event === node.event){
            childMachines.forEach(child => {
              child.receive({ event, payload })
            })
          }
        })
      }
      return {
        machine,
        children: childMachines,
        definition: node
      }
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