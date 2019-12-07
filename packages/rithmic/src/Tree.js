const Registry = require('./Registry')

module.exports = class Tree {

  constructor({
    eventBus,
    installer,
    machineFactory
  }){

    this.eventBus = eventBus
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

      /* create and register the machine */
      const machine = this.machineFactory.create({ schema })

      /* initialize a mutable object that can be updated */
      /*  for creations and deletions */
      const obj = { machine, definition: node }

      /* install the machine into the system */
      this.installer.installMachine(machine)

      /* create the machine tree from the child as the root */
      const childMachines = children.map(child => traverse(child, obj))

      /* the 'create' directive allows the parent to create a child */
      /* by sending an event */
      if(node.create){

        /* watch the parent for any events it sends */
        parent.machine.onSend(({ event, payload }) => {

          /* if the event the parent sends is not the 'create' */
          /* event then just return forward */
          if(event !== node.create) return

          /* the 'create' directive takes effect and creates a child */
          const child = traverse(node, parent)

          /* the child is added to the machine tree */
          parent.children.push(child)

          /* the child can delete itself. when it does remove it from the tree */
          child.machine.onDelete(() => {
            const index = parent.children.findIndex(({ machine }) => {
              machine.id === child.machine.id
            })
            parent.children.splice(index, 1)
          })

          /* once child is created and added then call constructor */
          child.machine.callConstructor(payload)
        })
      }
      obj.children = childMachines
      return obj
    }
    
    const { root } = this.treeRegistry.get({ id: treeId })
    this.tree = traverse(root)

    return this.tree

  }

  createObjectTree(){

    const traverse = ({ machine, children }) => {

      const childrenObject = children.reduce((accum, child) => {
        const { schema, alias, array } = child.definition
        child = traverse(child)
        const key = alias || schema
        let value
        if(array) value = accum[key] ? [...accum[key], child] : [child]
        else value = child
        return {
          ...accum,
          [key]: value
        }
      }, {})

      return {
        data: machine.data,
        state: machine.getStates(),
        children: childrenObject,
        send: this.eventBus.publish.bind(this.eventBus),
        key: machine.id
      }
    }

    return traverse(this.tree)

  }

}