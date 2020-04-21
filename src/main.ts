import { SnapTransactionState } from "snap-checker";
import { fetchDocument } from "tripledoc";
import { ldp, space, acl, vcard } from "rdf-namespaces";
import { PodData } from "./PodData";
import { Contact } from "./Contact";

window.onload = (): void => {
  console.log("document ready");
  ((window as unknown) as {
    solid: {
      auth: {
        trackSession: (callback: (session: { webId: string }) => void) => void;
      };
    };
  }).solid.auth.trackSession(async (session: { webId: string }) => {
    if (!session) {
      console.log("The user is not logged in");
      document.getElementById(
        "loginBanner"
      ).innerHTML = `<button onclick="solid.auth.login(window.location.toString())">Log in or register</button>`;
      document.getElementById("ui").style.display = "none";
    } else {
      console.log(`Logged in as ${session.webId}`);

      // (window as any).getDocument = getDocument;

      const podRoot = session.webId.substring(
        0,
        session.webId.length - "profile/card#me".length
      );

      const podData = new PodData(session.webId, podRoot);
      ((window as unknown) as any).podData = podData;
      ((window as unknown) as any).fetchDocument = fetchDocument;
      ((window as unknown) as any).ldp = ldp;
      ((window as unknown) as any).space = space;
      ((window as unknown) as any).acl = acl;
      ((window as unknown) as any).vcard = vcard;
      ((window as unknown) as any).as = {
        following: "https://www.w3.org/TR/activitypub/#following"
      };
      ((window as unknown) as any).addSomeone = async (): Promise<void> => {
        const webId = document.getElementById("webId").getAttribute("value");
        const nick = document.getElementById("nick").getAttribute("value");
        await podData.addContact(webId, nick);
      };

      const contacts = await podData.getContacts();
      let peer = "alice";
      if (
        session.webId === "https://lolcathost.de/storage/alice/profile/card#me"
      ) {
        peer = "bob";
      }
      let foundPeer = false;
      const promises = contacts.map(async (contact: Contact) => {
        console.log("loading contact", contact);
        if (contact.theirInbox.split("/")[4] === peer) {
          foundPeer = true;
        }
        console.log("Loading bilateral message history", contact);
        await contact.fetchMessages();
        // console.log("Sending a message", contact);
        // return contact.sendMessage({
        //   transId: 1,
        //   newState: SnapTransactionState.Proposing,
        //   amount: 20
        // });
      });
      contacts.map((contact: Contact) => {
        const li = document.createElement("li");
        li.innerText = contact.theirName;
        document.getElementById("contacts").appendChild(li);
      });
      if (!foundPeer) {
        document
          .getElementById("webId")
          .setAttribute(
            "value",
            `https://lolcathost.de/storage/${peer}/profile/card#me`
          );
        document
          .getElementById("nick")
          .setAttribute(
            "value",
            peer.substring(0, 1).toLocaleUpperCase() + peer.substring(1)
          );
      }

      document.getElementById(
        "loginBanner"
      ).innerHTML = `Logged in as ${session.webId} <button onclick="solid.auth.logout()">Log out</button>`;
      document.getElementById("ui").style.display = "block";
    }
  });
};
