
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
    machine._request = this.eventBus.publish.bind(this.eventBus)
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
    subscriptions.forEach(({ event, method, guard }) => {
      this.eventBus.subscribe({
        event,
        subscriber: machine.id,
        callback: ({ event, payload }) => {
          if(guard){
            const isGuarded = !machine.callMethod(guard, event, payload)
            if(isGuarded) return
          }
          const { response } = machine.callMethod(method, event, payload) || {}
          return response
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