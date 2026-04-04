export globalToken = function(){
  var extractToken = function (res) {
    var result = eval(res);
    var isValid = false;
    if (result && result.status && result.status === 'success' && result.token) {
      isValid = true;
    }
    return isValid ? result.token : 'anon';
  };
  return new Promise(function (resolve, reject) {
      PageMethods.ExtAPIGenerateToken(function (tkn) {
          tkn = extractToken(tkn);
          PageMethods.ExtAPIValidateToken(tkn, function (usr) {
              var user = eval(usr);
              if (user.email) {
                  token = brandInfo.initials + '_' + encodeURIComponent(tkn);
                  resolve(token);
              } else {
                  reject(new Error("token generatin error… no user found"));
              }
          });
      });
  });
}
