import { SnapTransactionState } from "snap-checker";
import { SnapSolid } from "./SnapSolid";
import { SnapContact } from "./SnapContact";
import { forDebugging } from "./forDebugging";

export async function runPresentation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  window: any,
  sessionWebId: string
): Promise<void> {
  const snapSolid = new SnapSolid(sessionWebId);
  forDebugging(window as unknown, snapSolid);

  document.getElementById(
    "loginBanner"
  ).innerHTML = `Logged in as ${sessionWebId} <button onclick="solid.auth.logout()">Log out</button>`;
  document.getElementById("ui").style.display = "block";

  window.addSomeone = async (): Promise<void> => {
    const webId = document.getElementById("webId").getAttribute("value");
    const nick = document.getElementById("nick").getAttribute("value");
    await snapSolid.addContact(webId, nick);
  };
  let peer = "alice";
  if (sessionWebId === "https://lolcathost.de/storage/alice/profile/card#me") {
    peer = "bob";
  }
  let foundPeer = false;
  const contacts = await snapSolid.getContacts();
  const promises = contacts.map(async (contact: SnapContact) => {
    if (contact.solidContact.theirInbox.split("/")[4] === peer) {
      foundPeer = true;
    }
    const li = document.createElement("li");
    li.appendChild(document.createTextNode(contact.solidContact.nick));
    const amountInput = document.createElement("input");
    amountInput.setAttribute("value", "20");
    li.appendChild(amountInput);
    const button = document.createElement("button");
    button.onclick = (): void => {
      contact.sendMessage({
        transId: 1,
        newState: SnapTransactionState.Proposing,
        amount: parseInt(amountInput.getAttribute("value"))
      });
    };
    button.appendChild(document.createTextNode("Send IOU"));
    li.appendChild(button);
    document.getElementById("contacts").appendChild(li);
  });

  if (!foundPeer) {
    document
      .getElementById("webId")
      .setAttribute(
        "value",
        `https://lolcathost.de/storage/${encodeURIComponent(
          peer
        )}/profile/card#me`
      );
    document
      .getElementById("nick")
      .setAttribute(
        "value",
        peer.substring(0, 1).toLocaleUpperCase() + peer.substring(1)
      );
  }
  return void Promise.all(promises);
}
