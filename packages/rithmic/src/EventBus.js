module.exports = class EventBus {

  constructor(){

    this.events = {}
    this.eventSubscribers = {} 

  }

  publish(events){
    if(!Array.isArray(events)) events = [events]
    events.forEach(({ event, payload } = {}) => {
      if(!event) return
      const subscribers = this.events[event]
      if(!subscribers){
        return console.warn(`No subscribers for event ${event}`)
      }
      subscribers.forEach(({ callback }) => callback({event, payload}))
    })
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

  unsubscribe({ subscriber }){
    for(let i in this.events){
      const subscribers = this.events[i]
      for(let j = subscribers.length - 1; j >= 0; j--){
        if(subscribers[j].subscriber === subscriber){
          subscribers.splice(j,1)
        }
      }
    }
    return this
  }

}