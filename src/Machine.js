const err = require('./Errors')

const ON_TRANSITION = 'onTransition'
const ON_SEND = 'onSend'

class Machine {

  constructor(schema){

    const {
      states,
      transitions,
      messages,
      data = {},
    } = schema

    this.schema = schema
    this.id = schema.id
    this.states = this.deriveStates(states)
    this.transitions = this.deriveTransitions(transitions)
    this.events = this.deriveEvents(transitions)
    this.messages = this.deriveMessages(messages)
    this.state = this.getInitialState(states)
    this.data = { ...data }
    this.observers = {}

  }

  receive(event, payload){
    const transition = this.getTransition(event)
    this.callMethod(this.state.exit, event, payload)
    this.state = this.states[transition.target]
    this.callMethod(this.state.entry, event, payload)
    this.notifyObservers(ON_TRANSITION, { event, payload })
    this.callMethod(transition.method, event, payload)
  }

  getTransition(event){
    const key = `${this.state.id} ${event}`
    const transition = this.transitions[key]
    if(!transition) err(0, { stateId: this.state.id, event })
    if(!this.states[transition.target]) err(1, { target: transition.target })
    return transition
  }

  callMethod(method, event, payload){
    if(!method || !this.schema.methods) return this
    if(!this.schema.methods[method]) err(6, { method })
    const { data, send, receive } = this.schema.methods[method]({
      state: this.state,
      data: this.data,
      event,
      payload
    })
    if(data) this.data = data
    if(send) this.send(send)
    if(receive) this.receive(receive)
    return this
  }

  deriveStates(states){
    if(!states) err(2)
    return states.reduce((accum, state) => ({
      ...accum,
      [state.id]: state
    }), {})
  }

  deriveTransitions(transitions){
    if(!transitions) err(3)
    return transitions.reduce((accum, transition) => {
      if(!transition.source || !transition.target || !transition.event){
        err(4)
      }
      const { source, event } = transition
      return {
        ...accum,
        [`${source} ${event}`]: transition
      }
    }, {})
  }

  deriveEvents(transitions){
    return transitions.reduce((accum, { source, event }) => ({
      ...accum,
      [source]: accum[source] ? [...accum[source], event] : [event]
    }), {})
  }

  deriveMessages(messages){
    if(!messages) return this
    return messages.reduce((accum, { event, method }) => ({
      ...accum,
      [event]: method
    }), {})
  }

  getInitialState(states){
    return states.find(({ initial }) => initial)
  }

  send(message){
    if(!message) return
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
    if(!this.observers[event]) return this
    this.observers[event].forEach(observer => observer(payload))
    return this
  }

}

module.exports = Machine