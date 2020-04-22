import { PodData } from "./solid-models/PodData";
import { fetchDocument, createDocumentInContainer } from "tripledoc";
import { ldp, space, acl, vcard } from "rdf-namespaces";
import { SolidContact } from "./solid-models/SolidContact";
import { SnapTransactionState } from "snap-checker";
import { SnapSolid } from "./SnapSolid";
import { SnapContact } from "./SnapContact";

function forDebugging(window: any, snapSolid: SnapSolid) {
  window.snapSolid = snapSolid;
  window.fetchDocument = fetchDocument;
  window.createDocumentInContainer = createDocumentInContainer;
  window.ldp = ldp;
  window.space = space;
  window.acl = acl;
  window.vcard = vcard;
  window.as = {
    following: "https://www.w3.org/TR/activitypub/#following"
  };
}

export async function runPresentation(
  window: any,
  sessionWebId: string
): Promise<void> {
  const snapSolid = new SnapSolid(sessionWebId);
  forDebugging(window as unknown, snapSolid);
  
  window.addSomeone = async (): Promise<void> => {
    const webId = document.getElementById("webId").getAttribute("value");
    const nick = document.getElementById("nick").getAttribute("value");
    await snapSolid.addContact(webId, nick);
  };

  const contacts = await snapSolid.getContacts();
  let peer = "alice";
  if (sessionWebId === "https://lolcathost.de/storage/alice/profile/card#me") {
    peer = "bob";
  }
  let foundPeer = false;
  const promises = contacts.map(async (contact: SnapContact) => {
    console.log("loading contact", contact);
    if (contact.solidContact.theirInbox.split("/")[4] === peer) {
      foundPeer = true;
    }
  });

  contacts.map((contact: SnapContact) => {
    const li = document.createElement("li");
    li.appendChild(document.createTextNode(contact.solidContact.nick));
    const button = document.createElement("button");
    button.onclick = (): void => {
      contact.sendMessage({
        transId: 1,
        newState: SnapTransactionState.Proposing,
        amount: 20
      });
    };
    button.appendChild(document.createTextNode("Send Message"));
    li.appendChild(button);
    document.getElementById("contacts").appendChild(li);
  });
  if (!foundPeer) {
    document
      .getElementById("webId")
      .setAttribute(
        "value",
        `https://lolcathost.de/storage/${encodeURIComponent(peer)}/profile/card#me`
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
  ).innerHTML = `Logged in as ${sessionWebId} <button onclick="solid.auth.logout()">Log out</button>`;
  document.getElementById("ui").style.display = "block";
}
