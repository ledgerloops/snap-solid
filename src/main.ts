import { Contact, sendMessage } from "./sendMessage";
import { SnapTransactionState } from "snap-checker";
import {
  VirtualSubject,
  describeSubject,
  VirtualContainer,
  describeContainer
} from "plandoc";
import { internal_fetchContainer } from "plandoc/dist/actors/container";
import { vcard } from "rdf-namespaces";

// copied from
// https://github.com/inrupt/friend-requests-exploration/blob/master/src/services/usePersonDetails.ts
const as = {
  following: "https://www.w3.org/TR/activitypub/#following"
};
const snap = {
  ourInbox: "https://ledgerloops.com/snap/#our-in",
  ourOutbox: "https://ledgerloops.com/snap/#our-out",
  theirInbox: "https://ledgerloops.com/snap/#their-in"
};

// there are two tasks, reading from message containers,
// and posting to message containers.
// Then there is the current user's addressbook.
// Maybe I want to create a Contact class with private variables for all three containers.

async function createMessageContainers(contactWebId: string) {
  const contactProfile;
}
async function loadMessages(contact: Contact): Promise<void> {
  const virtualContainerbox = describeContainer().isFoundOn(
    contact.ourSentboxUrl
  );
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
        const profile: VirtualSubject = describeSubject().isFoundAt(
          session.webId
        );
        const friendsGroup: VirtualSubject = describeSubject().isEnsuredOn(
          profile,
          as.following
        );
        const firstFriend: VirtualSubject = describeSubject().isFoundOn(
          friendsGroup,
          vcard.hasMember
        );
        const ourOutbox: VirtualContainer = describeContainer().isEnsuredOn(
          firstFriend,
          snap.ourOutbox
        );
        const ourInbox: VirtualContainer = describeContainer().isEnsuredOn(
          firstFriend,
          snap.ourInbox
        );
        const theirInbox: VirtualContainer = describeContainer().isEnsuredOn(
          firstFriend,
          snap.theirInbox
        );
        contacts = {
          "https://lolcathost.de/storage/bob/profile/card#me": {
            ourOutbox,
            ourInbox,
            theirInbox
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
