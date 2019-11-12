
const ON_TRANSITION = 'onTransition'
const ON_SEND = 'onSend'

class Machine {

  constructor(schema){

    const { states, transitions, data = {} } = schema

    this.schema = schema
    this.states = this.objectifyStates(states)
    this.transitions = this.objectifyTransitions(transitions)
    this.events = this.objectifyEvents(transitions)
    this.state = this.getInitialState(states)
    this.data = { ...data }
    this.observers = {}

  }

  receive(event, payload){
    const transition = this.getTransition(event)
    this.state = this.states[transition.target]
    this.notifyObservers(ON_TRANSITION, { event, payload })
    this.triggerActions(event, payload)
    this.send(this.state.send)
  }

  getTransition(event){
    const transition = this.transitions[`${this.state.id} ${event}`]
    if(!transition){
      throw(`Transition for ${state.id} ${event} does not exist`)
    }
    if(!this.states[transition.target]){
      throw(`Cannot transition to state ${transition.target} as it does not exist`)
    }
    return transition
  }

  triggerActions(event, payload){
    if(!this.schema.actions) return
    const { data } = this.schema.actions.forEach(action({
      event,
      state: this.state,
      payload,
      data: this.data
    }))
    if(data) this.data = data
  }

  objectifyStates(states){
    if(!states){
      throw('Schema does not have any states defined')
    }
    return states.reduce((accum, state) => ({
      ...accum,
      [state.id]: state
    }), {})
  }

  objectifyTransitions(transitions){
    if(!transitions){
      throw('Schema does not have any transitions defined')
    }
    return transitions.reduce((accum, transition) => {
      if(!transition.source || !transition.target || !transition.event){
        throw('Transitions need a source, target and event')
      }
      return {
        ...accum,
        [transition.source + transition.event]: transition
      }
    }, {})
  }

  objectifyEvents(transitions){
    return transitions.reduce((accum, { source, event }) => ({
      ...accum,
      [source]: accum[source] ? [...accum[source], event] : [event]
    }), {})
  }

  getInitialState(states){
    return states.find(({ initial }) => initial)
  }

  send(messageId){
    if(!messageId) return
    const message = this.schema.messages[messageId]
    if(!message){
      throw(`Message ${messageId} does not exist`)
    }
    this.notifyObservers(ON_SEND, message)
    return this
  }

  isCurrentState(stateId){
    return this.state.id == stateId
  }

  isEventAvailable(event){
    return Boolean(this.events[this.state.id].includes(event))
  }

  onSend(callback){
    this.addObserver(ON_SEND, callback)
    return this
  }

  onTransition(callback){
    this.addObserver(ON_TRANSITION, callback)
    return this
  }

  addObserver(event, callback){
    if(!this.observers[event]){
      this.observers[event] = []
    }
    this.observers[event].push(callback)
    return this
  }

  notifyObservers(event, payload){
    this.observers[event].forEach(observer => observer(payload))
    return this
  }

}

module.exports = Machine