import { TripleSubject } from "plandoc";
import { StateTransition } from "snap-checker";

export class Contact {
  addressbookEntry: TripleSubject;
  constructor(addressbookEntry: TripleSubject) {
    this.addressbookEntry = addressbookEntry;
    this.snapChecker = new SnapChecker();
  }
  sendMessage(msg: StateTransition) {}
  fetchSentMessages() {}
  fetchReceivedMessages() {}
  fetchMessages() {}
  subscribeToReceivedMessage() {}
}
