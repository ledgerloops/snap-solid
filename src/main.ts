// import { SnapChecker } from "snap-checker";

import { getDocument } from "./documentCache";

async function checkInbox(webId: string): Promise<void> {
  const profileDoc = await getDocument(webId);
  console.log(profileDoc);
}

window.onload = (): void => {
  console.log("document ready");
  ((window as unknown) as {
    solid: {
      auth: {
        trackSession: (callback: (session: { webId: string }) => void) => void;
      };
    };
  }).solid.auth.trackSession((session: { webId: string }) => {
    if (!session) {
      console.log("The user is not logged in");
      document.getElementById(
        "loginBanner"
      ).innerHTML = `<button onclick="solid.auth.login(window.location.toString())">Log in or register</button>`;
      document.getElementById("ui").style.display = "none";
    } else {
      console.log(`Logged in as ${session.webId}`);
      checkInbox(session.webId);
      (window as any).getDocument = getDocument;
      document.getElementById(
        "loginBanner"
      ).innerHTML = `Logged in as ${session.webId} <button onclick="solid.auth.logout()">Log out</button>`;
      document.getElementById("ui").style.display = "block";
    }
  });
};
