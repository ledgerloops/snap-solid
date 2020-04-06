// import { SnapChecker } from "snap-checker";

import { getDocument } from "./documentCache";

async function loadMessages(
  ourSentbox: string,
  ourInbox: string
): Promise<void> {
  const sentBoxDoc = await getDocument(ourSentbox);
  const inboxDoc = await getDocument(ourInbox);
  console.log(sentBoxDoc.getStatements(), inboxDoc.getStatements());
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
      let contacts;
      if (
        session.webId === "https://lolcathost.de/storage/alice/profile/card#me"
      ) {
        contacts = {
          "https://lolcathost.de/storage/bob/profile/card#me": {
            ourSentbox: "https://lolcathost.de/storage/alice/snap/out/bob/",
            ourInbox: "https://lolcathost.de/storage/alice/snap/in/bob/",
            theirInbox: "https://lolcathost.de/storage/bob/snap/in/alice/"
          }
        };
      }
      if (
        session.webId === "https://lolcathost.de/storage/bob/profile/card#me"
      ) {
        contacts = {
          "https://lolcathost.de/storage/alice/profile/card#me": {
            ourSentbox: "https://lolcathost.de/storage/bob/snap/out/alice/",
            ourInbox: "https://lolcathost.de/storage/bob/snap/in/alice/",
            theirInbox: "https://lolcathost.de/storage/alice/snap/in/bob/"
          }
        };
      }
      Object.keys(contacts).forEach((contact: string) => {
        console.log("Loading bilateral message history", contact);
        loadMessages(contacts[contact].ourSentbox, contacts[contact].ourInbox);
      });
      (window as any).getDocument = getDocument;
      document.getElementById(
        "loginBanner"
      ).innerHTML = `Logged in as ${session.webId} <button onclick="solid.auth.logout()">Log out</button>`;
      document.getElementById("ui").style.display = "block";
    }
  });
};
