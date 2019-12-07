module.exports = class Observable {

  constructor(){
    this.observers = {}
    this.signatures = {}
  }

  subscribe(event, callback){
    const signature = `${event}_${callback.toString()}`
    if(this.signatures[signature]) return
    if(!this.observers[event]){
      this.observers[event] = []
    }
    this.observers[event].push(callback)
    this.signatures[signature] = true
    return this
  }

  publish(event, payload){
    if(!this.observers[event]) return this
    this.observers[event].forEach(observer => observer(payload))
    return this
  }

}