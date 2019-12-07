const Observable = require('./Observable')

module.exports = class WatchMultiplex {

  constructor(){
    this.observable = new Observable()

    this.receive = payload => {
      this.observable.publish('*', payload)
    }
  }

  subscribe(callback){
    this.observable.subscribe('*', callback)
    return this
  }

}