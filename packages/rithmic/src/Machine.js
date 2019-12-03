const err = require('./Errors')

const ON_TRANSITION = 1
const ON_SEND = 2
const ON_METHOD_CALL = 3
const ON_ADD_TAG = 4
const ON_DELETE = 5
const ON_CREATE_CHILD_REQUEST = 6
class Machine {

  constructor(schema){

    const {
      tags = [],
      states,
      transitions,
      messages,
      children,
      data = {},
    } = schema

    this.schema = schema
    this.id = schema.id
    this.tags = [...tags]
    this.ref = null
    this.states = this.indexStates(states)
    this.transitions = this.indexTransitions(transitions)
    this.events = this.indexEvents(transitions)
    this.messages = this.indexMessages(messages)
    this.children = this.indexChildren(children)
    this.childRefs = this.initChildRefs(children)
    this.state = this.getInitialState(states)
    this.data = { ...data }
    this.observers = {}

  }

  receive({event, payload}){
    const transition = this.getTransition(event, payload)
    if(!transition) return false
    if(!this.validateTransition(transition, event, payload)) return false
    this.callMethod(this.state.exit, event, payload)
    this.state = this.states[transition.target]
    this.callMethod(this.state.entry, event, payload)
    this.notifyObservers(ON_TRANSITION, { event, payload, machine: this })
    this.callMethod(transition.method, event, payload)
  }

  getTransition(event, payload){
    const key = `${this.state.id} ${event}`
    let transition = this.transitions[key]
    if(!transition) return false
    const isConditional = Array.isArray(transition.target)
    if(isConditional){
      const index = this.callMethod(transition.target[0], event, payload)
      transition = { ...transition, target: transition.target[!index + 1] }
    }
    const targetState = !this.states[transition.target]
    if(targetState){
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
      state: this.state,
      data: this.data,
      event,
      payload
    })
    const {
      data,
      send,
      receive,
      addTag,
      delete: del
    } = response || {}
    if(data) this.data = data
    if(send) this.send(send)
    if(receive) this.receive(receive)
    if(addTag) this.addTag(addTag)
    if(del) this.delete()
    this.notifyObservers(ON_METHOD_CALL, { event, payload, machine: this })
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
      const { source, target, event } = transition
      const isInvalid = source && target && event
      if(!isInvalid) err(4)
      const transitionKey = `${source} ${event}`
      return {
        ...accum,
        [transitionKey]: transition
      }
    }, {})
  }

  indexEvents(transitions){
    return transitions.reduce((accum, { source, event }) => ({
      ...accum,
      [source]: accum[source] ? [...accum[source], event] : [event]
    }), {})
  }

  indexMessages(messages){
    if(!messages) return this
    return messages.reduce((accum, { event, method }) => ({
      ...accum,
      [event]: method
    }), {})
  }

  indexChildren(children){
    if(!children) return {}
    return children.reduce((accum, child) => ({
      ...accum,
      [child.id]: child
    }), {})
  }

  initChildRefs(children){
    if(!children) return {}
    return children.reduce((accum, child) => {
      const isArray = Array.isArray(child.schema)
      return {
        ...accum,
        [child.id]: isArray ? [] : null
      }
    }, {})
  }

  getInitialState(states){
    return states.find(({ initial }) => initial)
  }

  callConstructor(payload){
    const { methods } = this.schema
    if(methods && methods.constructor){
      this.callMethod('constructor', null, payload)
    }
  }

  send(messages){
    console.log('send')
    if(!messages) return
    if(!Array.isArray(messages)) messages = [messages]
    messages.forEach(message => message && this.notifyObservers(ON_SEND, message))
    return this
  }

  addTag(tag){
    this.tags.push(tag)
    this.notifyObservers(ON_ADD_TAG, tag)
    return this
  }

  delete(){
    this.notifyObservers(ON_DELETE, this)
    return this
  }

  getStates(){
    let accum = []
    if(!this.state) return {}
    return this.state.id.split('.').reduce((states, state) => {
      accum.push(state)
      return { ...states, [accum.join('.')]: true }
    }, {})
  }

  isCurrentState(stateId){
    return this.state.id == stateId
  }

  is(stateId){
    return this.getStates()[stateId]
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

  onMethodCall(callback){
    this.addObserver(ON_METHOD_CALL, callback)
    return this
  }

  onAddTag(callback){
    this.addObserver(ON_ADD_TAG, callback)
    return this
  }

  onDelete(callback){
    this.addObserver(ON_DELETE, callback)
    return this
  }

  onCreateChildRequest(callback){
    this.addObserver(ON_CREATE_CHILD_REQUEST, callback)
    return this
  }

  watch(callback){
    this.addObserver(ON_TRANSITION, callback)
    this.addObserver(ON_METHOD_CALL, callback)
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