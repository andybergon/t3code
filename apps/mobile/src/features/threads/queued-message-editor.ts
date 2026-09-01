import type { QueuedThreadMessage } from "../../state/thread-outbox";

export function queuedMessageCanSave(message: QueuedThreadMessage, draftText: string): boolean {
  return draftText.trim().length > 0 || message.attachments.length > 0;
}

export function queuedMessageWithEditedText(
  message: QueuedThreadMessage,
  draftText: string,
): QueuedThreadMessage {
  return {
    ...message,
    text: draftText.trim(),
  };
}
