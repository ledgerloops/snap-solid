"use strict";

// import { SnapChecker } from "snap-checker";
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
      document.getElementById("loginBanner").innerHTML = "Logged in as ".concat(
        session.webId,
        ' <button onclick="solid.auth.logout()">Log out</button>'
      );
      document.getElementById("ui").style.display = "block";
    }
  });
};
//# sourceMappingURL=index.js.map
