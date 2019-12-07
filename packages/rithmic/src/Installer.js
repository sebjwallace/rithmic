
module.exports = class Installer {

  constructor({
    eventBus,
    machineFactory,
    watchMultiplex
  }){
    this.eventBus = eventBus
    this.machineFactory = machineFactory
    this.watchMultiplex = watchMultiplex
  }

  installMachine(machine){
    machine.onDelete(() => this.uninstallMachine(machine))
    this.handleSubscriptions(machine)
    this.handleTransitions(machine)
    this.handleMachineMessages(machine)
    machine.watch(this.watchMultiplex.receive)
    return this
  }

  uninstallMachine(machine){
    this.eventBus.unsubscribe({ subscriber: machine.id })
    this.machineFactory.removeMachine(machine)
    return this
  }

  handleSubscriptions(machine){
    const { schema: { subscriptions } } = machine
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

  handleTransitions(machine){
    const { schema: { transitions } } = machine
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