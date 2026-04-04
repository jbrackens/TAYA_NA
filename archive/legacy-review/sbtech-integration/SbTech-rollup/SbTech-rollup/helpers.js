BetSlip.OnAdd.agGetBetslipData = function(event,data){
  setTimeout(function(){
    console.log(data.EventTypeID);
    let betslipData = {
      masterEventID: parseInt(data.MasterEventID) || 0,
      eventID: data.EventID || null,
      lineID: data.LineID || null,
      lineTypeID: data.LineTypeID || null,
      eventTypeId: data.EventTypeID,
      leagueId: data.LeagueID || null
   }
    console.log('betslip data', JSON.stringify(betslipData));
  }, 500)
}

let args = JSON.parse('{"masterEventID":0,"eventID":99156285,"lineID":1131646722,"odds":225,"lineGroupID":null,"lineTypeID":4,"rowTypeID":null,"points":0,"isLive":null,"isQA":true,"eventTypeId":8,"leagueId":202137,"betId":null,"preventUpdating":null,"isFavedTeam":null,"qaParameter1":1347279,"qaParameter2":-1}')
BetSlipUtil.addOddToSlip(args.masterEventID, args.eventID, args.lineID, null, null, args.lineTypeID, null, 0,null, true, args.eventTypeId, args.leagueId, null, null, null, null, null, null)

BetSlip.OnAdd.log = function(event,data){
  console.log(data);
}
