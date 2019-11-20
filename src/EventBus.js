module.exports = class EventBus {

  constructor(){

    this.events = {}
    this.eventSubscribers = {} 

  }

  publish({event, payload}){
    const subscribers = this.events[event]

    if(!subscribers){
      return console.warn(`No subscribers for event ${event}`)
    }

    subscribers.forEach(({ callback }) => callback({event, payload}))
    return this
  }

  subscribe({ event, events, subscriber, callback }){

    if(event) events = [event]

    events.forEach(event => {

      const eventSubscriber = `${event} ${subscriber}`
      if(subscriber && this.eventSubscribers[eventSubscriber])
        return
      if(subscriber)
        this.eventSubscribers[eventSubscriber] = true

      if(!this.events[event]){
        this.events[event] = []
      }
  
      this.events[event].push({ subscriber, callback })

    })

    return this
  }

}