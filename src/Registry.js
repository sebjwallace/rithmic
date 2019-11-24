
module.exports = class {

  constructor(){

    this.items = {}
    this.tags = {}
    this.itemTagIndex = {}

  }

  register({ item, id, tags }){

    if(!this.items[id]){
      this.items[id] = item
    } else {
      console.warn(`Item ${id} is already registered`)
    }

    if(tags){
      tags.forEach(tag => this.bindTag({ tag, item }))
    }

    return this
  }

  bindTag({ tag, id, item }){

    if(!this.tags[tag]){
      this.tags[tag] = []
    }

    const itemTagKey = `${tag} ${id}`
    const isAlreadyBinded = this.itemTagIndex[itemTagKey]
    if(!isAlreadyBinded){
      this.itemTagIndex[itemTagKey] = true
      this.tags[tag].push(item)
    }
  }

  get({ id, tag, tags }){

    const warning = `Item ${id} has not been registered`
    
    if(id){
      const item = this.items[id]
      if(item) return item
    }

    if(tag){
      return this.tags[tag] && this.tags[tag][0]
    }
    
    if(tags){
      return tags.reduce((accum, tag) => {
        return [ ...accum, ...this.tags[tag] ]
      }, [])
    }

    console.warn(warning)

  }

  remove(id){
    delete this.items[id]
    return this
  }

}