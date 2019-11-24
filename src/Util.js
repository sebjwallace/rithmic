
module.exports = class Util {

  static UUID(){
    return Math.random().toString(36).substring(2)
  }

  static Uniquify(id){
    return `${id}_${Util.UUID()}`
  }

}