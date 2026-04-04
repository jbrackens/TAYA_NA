/* global BetSlipUtil */
export function agAddToBetslip(data){
  let eventTypeId = parseInt(data.eventTypeId) || null;
  let marketId = parseInt(data.marketId) || null;
  let lineIntId = parseInt(data.lineIntId) || null;
  let lineGroupId = parseInt(data.lineGroupId) || null;
  let price = data.price || null;
  let lineTypeId = parseInt(data.lineTypeId) || null;
  let qa = data.qa || false;
  let leagueId = parseInt(data.leagueId) || null;
  let masterEventId = parseInt(data.eventId) || 0;
  console.log('adding the following to betslip',data);
  console.log(`BetSlipUtil.addOddToSlip(${masterEventId},${marketId},${lineIntId},${price},${lineGroupId},${lineTypeId},null,0,null,${qa},${eventTypeId},${leagueId},null,null,null,null,null,null);`);
  BetSlipUtil.addOddToSlip(masterEventId,marketId,lineIntId,null,lineGroupId,lineTypeId,null,0,null,qa,eventTypeId,leagueId,null,null,null,null,null,null);
}

export function agGetBetslipData(data){
  let betslipData = {
    eventTypeId : parseInt(data.eventTypeId) || null,
    marketId : parseInt(data.marketId) || null,
    lineIntId : parseInt(data.lineIntId) || null,
    lineGroupId : parseInt(data.lineGroupId) || null,
    price : data.price || null,
    lineTypeId : parseInt(data.lineTypeId) || null,
    qa : data.qa || false,
    leagueId : parseInt(data.leagueId) || null,
    masterEventId : parseInt(data.eventId) || 0
 }
  console.log('betslip data', betslipData)
}
/*
BetSlip.OnAdd.agGetBetslipData = function(event,data){
  let betslipData = {
    masterEventId : data.MasterEventID || 0,
    marketId : data.EventID || null,
    lineIntId : data.LineID) || null,
    lineGroupId : data.LineGroupID || null,
    lineTypeId : data.LineTypeID || null,
    qa : false, // ??
    eventTypeId : data.EventTypeID || null,
    leagueId : data.LeagueID || null,
 }
  console.log('betslip data', betslipData)
}
*/
