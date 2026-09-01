import {
  CommandId,
  EnvironmentId,
  MessageId,
  ProviderInstanceId,
  ThreadId,
} from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import type { QueuedThreadMessage } from "../../state/thread-outbox";
import { queuedMessageCanSave, queuedMessageWithEditedText } from "./queued-message-editor";

const message: QueuedThreadMessage = {
  environmentId: EnvironmentId.make("environment-1"),
  threadId: ThreadId.make("thread-1"),
  messageId: MessageId.make("message-1"),
  commandId: CommandId.make("command-1"),
  text: "before",
  attachments: [],
  modelSelection: { instanceId: ProviderInstanceId.make("codex"), model: "gpt-5.6-sol" },
  runtimeMode: "full-access",
  interactionMode: "default",
  createdAt: "2026-09-01T00:00:00.000Z",
};

describe("queued message editor", () => {
  it("edits only the queued text and preserves delivery metadata", () => {
    expect(queuedMessageWithEditedText(message, "  after  ")).toEqual({
      ...message,
      text: "after",
    });
  });

  it("requires text unless the queued message still has attachments", () => {
    expect(queuedMessageCanSave(message, "   ")).toBe(false);
    expect(
      queuedMessageCanSave(
        {
          ...message,
          attachments: [
            {
              id: "image-1",
              previewUri: "file:///image.png",
              type: "image",
              name: "image.png",
              mimeType: "image/png",
              sizeBytes: 4,
              dataUrl: "data:image/png;base64,AAAA",
            },
          ],
        },
        "",
      ),
    ).toBe(true);
  });
});
