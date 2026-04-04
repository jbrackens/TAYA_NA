/* global sbInternalMsgBus */
export function openRealityCheck(){
  void(sbInternalMsgBus.internalMessageBus.emit(sbInternalMsgBus.InternalMessageBusChannels.realityCheck.show))
}
