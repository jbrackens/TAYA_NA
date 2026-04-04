/* global Application, CONSTANTS */
export function openHelpSection(event,page) {
  var device = Application.deviceType.get();
  var menuId = CONSTANTS.AccountMenuLinkTypes[page];
  if (device === 'IsDesktop') {
    event.preventDefault();
      Application.navigateTo('my-account-pop-up', false, [menuId]);
  } else if(event && event.target && event.target.href){
      window.location.href = event.target.href;
  }
}
