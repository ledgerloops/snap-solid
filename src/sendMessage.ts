import { StateTransition } from "snap-checker";
import { snapMessageToWeb } from "./message";

export type Contact = {
  theirInboxUrl: string;
  ourInboxUrl: string;
  ourSentboxUrl: string;
};

export async function sendMessage(
  msg: StateTransition,
  contact: Contact
): Promise<void> {
  await snapMessageToWeb(msg, contact.ourSentboxUrl);
  await snapMessageToWeb(msg, contact.theirInboxUrl);
}
