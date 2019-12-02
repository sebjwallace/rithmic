
const errors = [
  ({ stateId, event }) => `Transition for ${stateId} ${event} does not exist`,
  ({ target }) => `Cannot transition to state ${target} as it does not exist`,
  () => 'Schema does not have any states defined',
  () => 'Schema does not have any transitions defined',
  () => 'Transitions need a source, target and event',
  ({ messageId }) => `Message ${messageId} does not exist`,
  ({ method }) => `Method ${method} is not defined`
]

module.exports = function(code, data){
  throw(errors[code](data))
}