// import { SnapChecker } from "snap-checker";

import { getDocument } from "./documentCache";
import { Contact, sendMessage } from "./sendMessage";
import { SnapTransactionState } from "snap-checker";

async function loadMessages(contact: Contact): Promise<void> {
  const sentBoxDoc = await getDocument(contact.ourSentboxUrl);
  const inboxDoc = await getDocument(contact.ourInboxUrl);
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
      let contacts: { [webId: string]: Contact };
      if (
        session.webId === "https://lolcathost.de/storage/alice/profile/card#me"
      ) {
        contacts = {
          "https://lolcathost.de/storage/bob/profile/card#me": {
            ourSentboxUrl: "https://lolcathost.de/storage/alice/snap/out/bob/",
            ourInboxUrl: "https://lolcathost.de/storage/alice/snap/in/bob/",
            theirInboxUrl: "https://lolcathost.de/storage/bob/snap/in/alice/"
          }
        };
      }
      if (
        session.webId === "https://lolcathost.de/storage/bob/profile/card#me"
      ) {
        contacts = {
          "https://lolcathost.de/storage/alice/profile/card#me": {
            ourSentboxUrl: "https://lolcathost.de/storage/bob/snap/out/alice/",
            ourInboxUrl: "https://lolcathost.de/storage/bob/snap/in/alice/",
            theirInboxUrl: "https://lolcathost.de/storage/alice/snap/in/bob/"
          }
        };
      }
      Object.keys(contacts).forEach((contact: string) => {
        console.log("Loading bilateral message history", contact);
        loadMessages(contacts[contact]);
      });
      (window as any).getDocument = getDocument;
      (window as any).sendSomething = async (): Promise<void> => {
        await Promise.all(
          Object.keys(contacts).map((webId: string) => {
            console.log("Loading bilateral message history", contacts[webId]);
            return sendMessage(
              {
                transId: 1,
                newState: SnapTransactionState.Proposing,
                amount: 20
              },
              contacts[webId]
            );
          })
        );
      };
      document.getElementById(
        "loginBanner"
      ).innerHTML = `Logged in as ${session.webId} <button onclick="solid.auth.logout()">Log out</button>`;
      document.getElementById("ui").style.display = "block";
    }
  });
};
