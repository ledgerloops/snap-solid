import { StateTransition } from "snap-checker";
import { snapMessageToWeb } from "./message";
import { createDocumentInContainer } from "tripledoc";

export type Contact = {
  theirInboxUrl: string;
  ourInboxUrl: string;
  ourSentboxUrl: string;
};

export async function sendMessage(
  msg: StateTransition,
  contact: Contact
): Promise<void> {
  const theirInboxItem = createDocumentInContainer(contact.theirInboxUrl);
  await snapMessageToWeb(msg, theirInboxItem);
  const ourOutboxItem = createDocumentInContainer(contact.theirInboxUrl);
  await snapMessageToWeb(msg, ourOutboxItem);
}
