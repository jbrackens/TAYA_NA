import { globalDetails } from '../tools/user-details';
/* global UserInfo */
export function checkVerification(){
  function handleExtraData(details, tags){
    let modal = document.querySelector('#my-account-pop-up');
    let mobileContainer = document.querySelector('.AccountCheckDocumentBlock div[data-uat="my-acc-resp-block-content"]');
    let uCountry = details.Country;
    let status = 'Unknown';
    if(
      (UserInfo.current.Email.toLocaleLowerCase().includes('@gmx') && !tags.includes('sVerified')) ||
      (tags.includes('M_V_REQ') && !tags.includes('sVerified')) ||
      (tags.includes('sBlocked') && !tags.includes('sVerified'))
    ){
      status = 'Stamped';
      if(modal){
        modal.setAttribute('data-rstatus', 'sfailed');
      }
      if(mobileContainer){
        mobileContainer.setAttribute('data-rstatus', 'sfailed');
      }
    } else if( tags.includes('VerificationInProcess') ){
      if(modal){
        modal.setAttribute('data-rstatus', 'pending');
        console.log('account status - pending - dt');
        console.log('Checking Verification Tags in 3 seconds');
        setTimeout(
          function(){
            globalDetails.tags(true).then(
              function(t){
                handleExtraData(details, t);
              }
            );
        }, 3000);
      }
      else if(mobileContainer){
        mobileContainer.setAttribute('data-rstatus', 'pending');
        console.log('account status - pending - mb');
        console.log('Checking Verification Tags in 3 seconds');
        setTimeout(
          function(){
            globalDetails.tags(true).then(
              function(t){
                handleExtraData(details, t);
              }
            );
        }, 3000);
      }
    } else if(tags.includes('ExternalVerificationFailed')){
      status = 'Failed';
      if( (UserInfo.current && UserInfo.current.CountryOfRegistration === "99") || uCountry === "Ireland" ){
        //  ire flow
        if(modal){
          modal.setAttribute('data-rstatus', 'irepassed');
        }
        if(mobileContainer){
          mobileContainer.setAttribute('data-rstatus', 'irepassed');
        }
      } else {
        // uk flow
        if(modal){
          modal.setAttribute('data-rstatus', 'failed');
        }
        if(mobileContainer){
          mobileContainer.setAttribute('data-rstatus', 'failed');
        }
      }

    } else if(tags.includes('KYCVerified') || tags.includes('HelloSoda')){
      status = 'Passed';
      if(modal){
        modal.setAttribute('data-rstatus', 'passed');
      }
      if(mobileContainer){
        mobileContainer.setAttribute('data-rstatus', 'passed');
      }
      console.log('account status - passed');
    } else {
      status = 'Pending';
      if(modal){
        modal.setAttribute('data-rstatus', 'pending');
      }
      if(mobileContainer){
        mobileContainer.setAttribute('data-rstatus', 'pending');
      }
    }
    if(status !== 'Unknown'){
      window.dataLayer.push({
        'event': 'verification',
        'verificationStatus': status
      });
    }
  };
  Promise.all([
    globalDetails.details(),
    globalDetails.tags(true)
  ]).then(function([details, tags]){
    handleExtraData(details, tags);
  }).catch(function(){
    setTimeout(function(){
      checkVerification()
    }, 500);
  });
}
/*
function checkNewUsers(){
  return (
    Application.deviceType.isDesktop() &&
    UserInfo.current.Email.includes('gmail') &&
    (document.cookie.indexOf('btCookie') === -1 || document.cookie.indexOf('a_31b') > 0) &&
    new Date() - new Date(UserInfo.current.RegistrationDate) < 3600000
  )
} */


export function checkEPSVerification(){
  console.log('checking verfication status');
  function handleExtraData(details, tags){
    let epsPanel = document.querySelector('#eps-transfer');
    let dictionary = document.querySelector('#eps-vdictionary-overlay');
    let uCountry = details.Country;
    if(
      (UserInfo.current.Email.toLocaleLowerCase().includes('@gmx') && !tags.includes('sVerified')) ||
      (tags.includes('M_V_REQ') && !tags.includes('sVerified')) ||
      (tags.includes('sBlocked') && !tags.includes('sVerified'))
    ){
        epsPanel.classList.add('ffailed');
        //  css will hide deposit and show vextraoverlay
    } else if (dictionary){
      //  if dictioanry showing, then sbtech is hiding iframe, either show irish, pending, or failed.
      if ( (UserInfo.current && UserInfo.current.CountryOfRegistration === "99") || uCountry === "Ireland" ){
        epsPanel.classList.add('ipassed');
        // if pending recall after 3 seconds
        setTimeout(
          function(){
            document.location.reload();
        }, 5000);
        // check for irish user, in case account still prcoessing.
      } else if( tags.indexOf('VerificationInProcess') > -1 ){
        epsPanel.classList.add('vpending');
        // if pending recall after 3 seconds
        setTimeout(
          function(){
            document.location.reload();
        }, 5000);
      } else {
        epsPanel.classList.add('vfailed');
      }
    }
  }
  Promise.all([
    globalDetails.details(),
    globalDetails.tags(true)
  ]).then(function([details, tags]){
    handleExtraData(details, tags);
  })
}
