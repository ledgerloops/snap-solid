"use strict";

var _documentCache = require("./documentCache");

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }
  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}

function _asyncToGenerator(fn) {
  return function() {
    var self = this,
      args = arguments;
    return new Promise(function(resolve, reject) {
      var gen = fn.apply(self, args);
      function _next(value) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
      }
      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
      }
      _next(undefined);
    });
  };
}

function checkInbox(_x) {
  return _checkInbox.apply(this, arguments);
}

function _checkInbox() {
  _checkInbox = _asyncToGenerator(function*(webId) {
    var profileDoc = yield (0, _documentCache.getDocument)(webId);
    console.log(profileDoc);
  });
  return _checkInbox.apply(this, arguments);
}

window.onload = () => {
  console.log("document ready");
  window.solid.auth.trackSession(session => {
    if (!session) {
      console.log("The user is not logged in");
      document.getElementById("loginBanner").innerHTML =
        '<button onclick="solid.auth.login(window.location.toString())">Log in or register</button>';
      document.getElementById("ui").style.display = "none";
    } else {
      console.log("Logged in as ".concat(session.webId));
      checkInbox(session.webId);
      document.getElementById("loginBanner").innerHTML = "Logged in as ".concat(
        session.webId,
        ' <button onclick="solid.auth.logout()">Log out</button>'
      );
      document.getElementById("ui").style.display = "block";
    }
  });
};
//# sourceMappingURL=index.js.map
