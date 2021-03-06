const Observable = require('./Observable')
const err = require('./Errors')

const ON_TRANSITION = 1
const ON_SEND = 2
const ON_METHOD_CALL = 3
const ON_ADD_TAG = 4
const ON_DELETE = 5

class Machine {

  constructor(schema){

    const {
      tags = [],
      states,
      transitions,
      publications,
      data = {},
    } = schema

    this.schema = schema
    this.id = schema.id
    this.tags = [...tags]
    this.ref = null
    this.states = this.indexStates(states)
    this.transitions = this.indexTransitions(transitions)
    this.events = this.indexEvents(transitions)
    this.publications = this.indexPublications(publications)
    this.cstates = this.getInitialStates(states)
    this.data = { ...data }
    this.observable = new Observable()

  }

  receive({ event, payload }){
    this.cstates = this.cstates.map(state => {
      const transition = this.getTransition(state, event, payload)
      if(!transition) return state
      if(!this.validateTransition(transition, event, payload)) return state
      this.callMethod(state.exit, event, payload)
      state = this.states[transition.target] || state
      this.callMethod(state.entry, event, payload)
      this.callPublication(transition.publish)
      this.callMethod(transition.method, event, payload)
      return state
    })
    this.observable.publish(ON_TRANSITION, { event, payload, machine: this })
  }

  getTransition(state, event, payload){
    const key = `${state.id} ${event}`
    let transition = this.transitions[key]
    if(!transition) return false

    const isConditional = Array.isArray(transition.target)
    if(isConditional){
      const index = this.callMethod(transition.target[0], event, payload)
      transition = { ...transition, target: transition.target[!index + 1] }
    }

    const isSwitch = typeof transition.target === 'object'
    if(isSwitch){
      const switches = Object.keys(transition.target)
      const branch = switches.find(method => this.callMethod(method, event, payload))
      if(!branch) return
      const target = transition.target[branch]
      transition = { ...transition, target }
    }

    const targetState = this.states[transition.target]
    if(!targetState){
      return console.warn(`State ${transition.target} does not exist`)
    }

    return transition
  }

  validateTransition(transition, event, payload){
    if(!transition.guard) return true
    const guard = this.schema.methods[transition.guard]
    const isGuarded = guard({ data: this.data, event, payload })
    return isGuarded
  }

  callMethod(method, event, payload){
    if(!method || !this.schema.methods) return this
    if(!this.schema.methods[method]) err(6, { method })
    const response = this.schema.methods[method]({
      states: this.cstates,
      data: this.data,
      event,
      payload,
      request: this._request
    })
    const {
      data,
      send,
      receive,
      addTag,
      publish,
      delete: del,
      reset
    } = response || {}
    if(data) this.data = data
    if(send) this.send(send)
    if(receive) this.receive(receive)
    if(addTag) this.addTag(addTag)
    if(publish) this.callPublication(publish)
    if(del) this.delete()
    if(reset) this.reset()
    this.observable.publish(ON_METHOD_CALL, { event, payload, machine: this })
    return response
  }

  indexStates(states){
    if(!states) return
    return states.reduce((accum, state) => ({
      ...accum,
      [state.id]: state
    }), {})
  }

  indexTransitions(transitions){
    if(!transitions) return
    return transitions.reduce((accum, transition) => {
      const { source, event } = transition
      const sources = Array.isArray(source) ? source : [ source ]
      const transitions = sources.reduce((accum, source) => ({
        ...accum,
        [`${source} ${event}`]: transition
      }), {})
      return {
        ...accum,
        ...transitions
      }
    }, {})
  }

  indexEvents(transitions){
    return transitions.reduce((accum, { source, event }) => ({
      ...accum,
      [source]: accum[source] ? [...accum[source], event] : [event]
    }), {})
  }

  indexPublications(publications){
    if(!publications) return this
    return publications.reduce((accum, publication) => ({
      ...accum,
      [publication.id]: publication
    }), {})
  }

  getInitialStates(states){
    return states.filter(({ initial }) => initial)
  }

  callConstructor(payload){
    const { methods } = this.schema
    if(methods && methods.constructor){
      this.callMethod('constructor', null, payload)
    }
  }

  callPublication(publish){
    if(!publish) return
    publish = Array.isArray(publish) ? publish : [publish]
    publish.forEach(publication => {
      const { event, payload } = this.publications[publication]
      this.send({
        event,
        payload: payload({ data: this.data })
      })
    })
  }

  send(messages){
    if(!messages) return
    if(!Array.isArray(messages)) messages = [messages]
    for(let i = 0; i < messages.length; i++){
      const message = messages[i]
      if(!message) continue
      if(message.self) this.receive(message)
      else this.observable.publish(ON_SEND, message)
    }
    return this
  }

  addTag(tag){
    this.tags.push(tag)
    this.observable.publish(ON_ADD_TAG, tag)
    return this
  }

  delete(){
    this.observable.publish(ON_DELETE, this)
    return this
  }

  reset(){
    this.cstates = this.getInitialStates(this.schema.states)
    this.data = { ...this.schema.data }
    return this
  }

  getStates({ explode }){
    const states = {}
    for(let i = 0; i < this.cstates.length; i++){
      const state = this.cstates[i]
      if(!explode){
        states[state.id] = true
        continue
      }
      const substates = state.id.split('.')
      let accum = ''
      for(let j = 0; j < substates.length; j++){
        const substate = substates[j]
        accum += j ? '.' + substate : substate
        states[accum] = true
      }
    }
    return states
  }

  isCurrentState(stateId){
    return this.getStates().includes(stateId)
  }

  is(stateId){
    return this.getStates()[stateId]
  }

  onSend(callback, signature){
    this.observable.subscribe(ON_SEND, callback, signature)
    return this
  }

  onTransition(callback){
    this.observable.subscribe(ON_TRANSITION, callback)
    return this
  }

  onMethodCall(callback){
    this.observable.subscribe(ON_METHOD_CALL, callback)
    return this
  }

  onAddTag(callback){
    this.observable.subscribe(ON_ADD_TAG, callback)
    return this
  }

  onDelete(callback){
    this.observable.subscribe(ON_DELETE, callback)
    return this
  }

  watch(callback){
    this.observable.subscribe(ON_TRANSITION, callback)
    this.observable.subscribe(ON_METHOD_CALL, callback)
    return this
  }

}

module.exports = Machine