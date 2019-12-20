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
    this.index = {}

  }

  register(tree){

    this.treeRegistry.register({
      id: tree.id,
      item: tree
    })

  }

  getMachine(id){
    return this.index[id]
  }

  getMachines(tag){
    return this.index[tag] || []
  }

  createMachineTree(treeId){

    const traverse = (node) => {
      const { schema, children = [], id, tag } = node

      /* create and register the machine */
      const machine = this.machineFactory.create({ schema })

      /* index the machine so it can be required from client via id */
      if(id){
        this.index[id] = machine
      }

      /* index the machine so it can be required from client via tag */
      if(tag){
        if(!this.index[tag]){
          this.index[tag] = []
        }
        this.index[tag].push(machine)
      }

      /* initialize a mutable object that can be updated */
      /*  for creations and deletions */
      const obj = { machine, definition: node }

      /* install the machine into the system */
      this.installer.installMachine(machine)

      /* create the machine tree from the child as the root */
      const childMachines = children.reduce((accum, child) => {

        /* only create a child if its a singleton */
        if(!child.array){
          return [ ...accum, traverse(child) ]
        }

        /* the 'create' directive allows the parent to create a child */
        /* by sending an event */
        if(child.create){

          const signature = `${machine.id}_${child.schema}`

          /* watch the parent for any events it sends */
          machine.onSend(({ event, payload }) => {

            /* if the event the parent sends is not the 'create' */
            /* event then just return forward */
            if(event !== child.create) return

            /* the 'create' directive takes effect and creates a child */
            const childNode = traverse(child)

            /* the child is added to the machine tree */
            obj.children.push(childNode)

            /* the child can delete itself. when it does remove it from the tree */
            childNode.machine.onDelete(() => {
              const index = obj.children.findIndex(({ machine }) => {
                machine.id === childNode.machine.id
              })
              obj.children.splice(index, 1)
            })

            /* once child is created and added then call constructor */
            childNode.machine.callConstructor(payload)
          }, signature)

        }

        return accum
      }, [])

      obj.children = childMachines

      /* if the machine was not created by the parent then call its constructor */
      if(!node.create){
        machine.callConstructor()
      }
      
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
        state: machine.getStates({ explode: true }),
        children: childrenObject,
        send: this.eventBus.publish.bind(this.eventBus),
        key: machine.id,
        machine
      }
    }

    return traverse(this.tree)

  }

}