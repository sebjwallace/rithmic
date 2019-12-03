
module.exports = class Installer {

  constructor({
    eventBus,
    machineFactory
  }){
    this.eventBus = eventBus
    this.machineFactory = machineFactory
  }

  installMachine(machine){
    machine.onDelete(() => this.uninstallMachine(machine))
    this.handleSubscriptions(machine)
    this.handleTransitions(machine)
    this.handleMachineMessages(machine)
    machine.callConstructor()
    return this
  }

  uninstallMachine(machine){
    this.eventBus.unsubscribe({ subscriber: machine.id })
    this.machineFactory.removeMachine(machine)
    return this
  }

  handleSubscriptions({ schema: { subscriptions } }){
    if(!subscriptions) return
    subscriptions.forEach(({ event, method }) => {
      this.eventBus.subscribe({
        event,
        subscriber: machine.id,
        callback: ({ event, payload }) => {
          machine.callMethod(method, event, payload)
        }
      })
    })
  }

  handleTransitions({ schema: { transitions } }){
    if(!transitions) return
    transitions.forEach(({ event }) => {
      this.eventBus.subscribe({
        event,
        subscriber: machine.id,
        callback: machine.receive.bind(machine),
        disableDuplicateEventSubscriber: true
      })
    })
  }

  handleMachineMessages(machine){
    machine.onSend(({ event, payload }) => {
      this.eventBus.publish({ event, payload })
    })
  }

}