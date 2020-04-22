import {
  StateTransition,
  SnapTransactionState,
  checkStateTransitionIsValid
} from "snap-checker";
import { TripleDocument, createDocumentInContainer } from "tripledoc";
import { PodData } from "./solid-models/PodData";

const prefix = "https://legerloops.com/snap/#";
const ns = {
  snap: function(term: string): string {
    return prefix + term;
  }
};

function uriToTransactionState(uri: string): SnapTransactionState {
  switch (uri) {
    case ns.snap("Proposing"):
      return SnapTransactionState.Proposing;
    case ns.snap("Proposed"):
      return SnapTransactionState.Proposed;
    case ns.snap("Accepting"):
      return SnapTransactionState.Accepting;
    case ns.snap("Accepted"):
      return SnapTransactionState.Accepted;
    case ns.snap("Rejecting"):
      return SnapTransactionState.Rejecting;
    case ns.snap("Rejected"):
      return SnapTransactionState.Rejected;
  }
}

function transactionStateToUri(state: SnapTransactionState): string {
  switch (state) {
    case SnapTransactionState.Proposing:
      return ns.snap("Proposing");
    case SnapTransactionState.Proposed:
      return ns.snap("Proposed");
    case SnapTransactionState.Accepting:
      return ns.snap("Accepting");
    case SnapTransactionState.Accepted:
      return ns.snap("Accepted");
    case SnapTransactionState.Rejecting:
      return ns.snap("Rejecting");
    case SnapTransactionState.Rejected:
      return ns.snap("Rejected");
  }
}

export async function snapMessageFromWeb(
  doc: TripleDocument
): Promise<StateTransition> {
  const sub = doc.getSubject("#this");
  return {
    transId: sub.getInteger(ns.snap("transId")),
    newState: uriToTransactionState(sub.getRef(ns.snap("newState"))),
    amount: sub.getInteger(ns.snap("amount")),
    condition: sub.getString(ns.snap("condition")),
    preimage: sub.getString(ns.snap("preimage")),
    expiresAt: sub.getDateTime(ns.snap("expiresAt"))
  };
}

export async function snapMessageToWeb(
  msg: StateTransition,
  box: string
): Promise<void> {
  checkStateTransitionIsValid(msg);
  const doc = createDocumentInContainer(box);
  const sub = doc.addSubject({
    identifier: "#this"
  });
  sub.addInteger(ns.snap("transId"), msg.transId);
  sub.addRef(ns.snap("newState"), transactionStateToUri(msg.newState));
  if (msg.amount) {
    sub.addInteger(ns.snap("amount"), msg.amount);
  }
  if (msg.condition) {
    sub.addString(ns.snap("condition"), msg.condition);
  }
  if (msg.preimage) {
    sub.addString(ns.snap("preimage"), msg.preimage);
  }
  if (msg.expiresAt) {
    sub.addDateTime(ns.snap("expiresAt"), msg.expiresAt);
  }
  return void doc.save();
}

export class SnapSolid {
  podData: PodData;
  constructor(sessionWebId: string) {
    const podRoot = sessionWebId.substring(
      0,
      sessionWebId.length - "profile/card#me".length
    );
    this.podData = new PodData(sessionWebId, podRoot);
  }
  async addContact(webId: string, nick: string) {
    await this.podData.addContact(webId, nick);
  }
  async getContacts() {
    const contacts = this.podData.getContacts();
    // console.log("Loading bilateral message history", contact);
    // const docs: TripleDocument[] = await contact.fetchMessages();

    // console.log("Sending a message", contact);
    // return contact.sendMessage({
    //   transId: 1,
    //   newState: SnapTransactionState.Proposing,
    //   amount: 20
    // });
    return contacts;
  }
}
