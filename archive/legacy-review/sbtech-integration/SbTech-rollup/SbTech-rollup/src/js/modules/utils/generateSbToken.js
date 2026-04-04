/* global PageMethods */
import { getBrand } from '../utils/sn-only.js';
function GenerateSBToken(){
  var initialized = false;
  var token;
  var extractToken = function (res) {
    var result = eval(res);
    var isValid = false;
    if (result && result.status && result.status === 'success' && result.token) {
      isValid = true;
    }
    return isValid ? result.token : 'anon';
  };
  var init = function () {
    if (initialized) {
      return false;
    }

    sessionStorage.removeItem('ag-token');

    function updateToken() {
      console.log('updating token');
      PageMethods.ExtAPIGenerateToken(function (tkn) {
        tkn = extractToken(tkn);
        PageMethods.ExtAPIValidateToken(tkn, function (usr) {
          var user = eval(usr);
          if (user.email) {
            var brand = getBrand();
            token = brand.initials + '_' + encodeURIComponent(tkn);
            console.log(token);
            sessionStorage.setItem('ag-token', token);
          }
        });
      });
      setTimeout(updateToken, 25000);
    }
    updateToken();
  };
  var onceToken = function () {
    return new Promise(function (resolve, reject) {
      PageMethods.ExtAPIGenerateToken(function (tkn) {
        tkn = extractToken(tkn);
        PageMethods.ExtAPIValidateToken(tkn, function (usr) {
          var user = eval(usr);
          if (user.email) {
            var brand = getBrand();
            token = brand.initials + '_' + encodeURIComponent(tkn);
            console.log(token);
            resolve(token);
          } else {
            reject(new Error("token generatin error… no user found"));
          }
        });
      });
    });
  };
  var returnToken = function () {
    return token || 'token error';
  };
  return {
    onceToken: onceToken,
    init: init,
    getToken: returnToken
  };
};

export const generateSBToken = GenerateSBToken();
