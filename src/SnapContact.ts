import {
  StateTransition,
  SnapChecker,
  SnapTransactionState,
  checkStateTransitionIsValid
} from "snap-checker";
import {
  TripleDocument,
  createDocumentInContainer,
  LocalTripleDocumentForContainer
} from "tripledoc";
import { SolidContact } from "./solid-models/SolidContact";

// copied from
// https://github.com/inrupt/friend-requests-exploration/blob/master/src/services/usePersonDetails.ts
export const as = {
  following: "https://www.w3.org/TR/activitypub/#following"
};

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

export function snapMessageFromWeb(doc: TripleDocument): StateTransition {
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
  return void doc.save();
}

export class SnapContact {
  snapChecker: SnapChecker;
  solidContact: SolidContact;
  constructor(solidContact: SolidContact) {
    this.solidContact = solidContact;
    this.snapChecker = new SnapChecker(["me"]);
  }

  async sendMessage(msg: StateTransition): Promise<void> {
    return this.solidContact.sendMessage(
      async (doc: LocalTripleDocumentForContainer) => {
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
      }
    );
  }

  async loadMessages(): Promise<void> {
    const docsSent: TripleDocument[] = await this.solidContact.fetchSentMessages();
    const docsRcvd: TripleDocument[] = await this.solidContact.fetchReceivedMessages();
    docsSent.map((doc: TripleDocument) => {
      const snapMessage = snapMessageFromWeb(doc);
      this.snapChecker.processMessage({
        from: "me",
        to: this.solidContact.nick,
        unit: "10E-6 USD",
        stateTransition: snapMessage,
        time: new Date()
      });
    });
    docsRcvd.map((doc: TripleDocument) => {
      const snapMessage = snapMessageFromWeb(doc);
      this.snapChecker.processMessage({
        from: this.solidContact.nick,
        to: "me",
        unit: "10E-6 USD",
        stateTransition: snapMessage,
        time: new Date()
      });
    });
  }
}
