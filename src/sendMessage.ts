import { StateTransition } from "snap-checker";
import { snapMessageToWeb } from "./message";

export type Contact = {
  inboxUrl: string;
  sentboxUrl: string;
};

export async function sendMessage(
  msg: StateTransition,
  contact: Contact
): Promise<void> {
  await snapMessageToWeb(msg, contact.sentboxUrl);
  await snapMessageToWeb(msg, contact.inboxUrl);
}
