module.exports = class EventBus {

  constructor(){

    this.events = {}

  }

  publish({event, payload}){
    const subscribers = this.events[event]

    if(!subscribers){
      return console.warn(`No subscribers for event ${event}`)
    }

    subscribers.forEach(({ callback }) => callback(event, payload))
    return this
  }

  subscribe({ event, subscriber, callback }){
    if(!this.events[event]){
      this.events[event] = []
    }

    this.events[event].push({ subscriber, callback })

    return this
  }

}