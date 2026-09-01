import { useCallback, useEffect, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MessageId } from "@t3tools/contracts";

import { AppText as Text, AppTextInput as TextInput } from "../../components/AppText";
import { showConfirmDialog } from "../../components/ConfirmDialogHost";
import type { QueuedThreadMessage } from "../../state/thread-outbox";
import {
  holdEditingQueuedMessage,
  releaseEditingQueuedMessage,
} from "../../state/use-thread-outbox";
import { queuedMessageCanSave } from "./queued-message-editor";

export function QueuedMessagesModal(props: {
  readonly visible: boolean;
  readonly messages: ReadonlyArray<QueuedThreadMessage>;
  readonly onClose: () => void;
  readonly onUpdate: (message: QueuedThreadMessage, text: string) => Promise<boolean>;
  readonly onRemove: (message: QueuedThreadMessage) => Promise<boolean>;
}) {
  const insets = useSafeAreaInsets();
  const [editingMessageId, setEditingMessageId] = useState<MessageId | null>(null);
  const [draftText, setDraftText] = useState("");
  const [busyMessageId, setBusyMessageId] = useState<MessageId | null>(null);
  const editingMessage =
    props.messages.find((message) => message.messageId === editingMessageId) ?? null;

  const stopEditing = useCallback(() => {
    if (editingMessageId !== null) {
      releaseEditingQueuedMessage(editingMessageId);
    }
    setEditingMessageId(null);
    setDraftText("");
  }, [editingMessageId]);

  const close = useCallback(() => {
    stopEditing();
    props.onClose();
  }, [props, stopEditing]);

  useEffect(() => {
    if (editingMessageId !== null && editingMessage === null) {
      releaseEditingQueuedMessage(editingMessageId);
      setEditingMessageId(null);
      setDraftText("");
    }
  }, [editingMessage, editingMessageId]);

  useEffect(
    () => () => {
      if (editingMessageId !== null) {
        releaseEditingQueuedMessage(editingMessageId);
      }
    },
    [editingMessageId],
  );

  const beginEditing = useCallback(
    (message: QueuedThreadMessage) => {
      stopEditing();
      holdEditingQueuedMessage(message.messageId);
      setEditingMessageId(message.messageId);
      setDraftText(message.text);
    },
    [stopEditing],
  );

  const saveEditing = useCallback(async () => {
    if (editingMessage === null || !queuedMessageCanSave(editingMessage, draftText)) return;
    setBusyMessageId(editingMessage.messageId);
    try {
      const updated = await props.onUpdate(editingMessage, draftText);
      if (updated) {
        stopEditing();
      } else {
        Alert.alert("Queued message changed", "Reopen the message and try your edit again.");
      }
    } catch (error) {
      Alert.alert(
        "Could not update queued message",
        error instanceof Error ? error.message : "The queued message could not be updated.",
      );
    } finally {
      setBusyMessageId(null);
    }
  }, [draftText, editingMessage, props, stopEditing]);

  const remove = useCallback(
    async (message: QueuedThreadMessage) => {
      holdEditingQueuedMessage(message.messageId);
      setBusyMessageId(message.messageId);
      try {
        const removed = await props.onRemove(message);
        if (!removed) {
          Alert.alert("Queued message changed", "Reopen the queue and try cancelling it again.");
        }
      } catch (error) {
        Alert.alert(
          "Could not cancel queued message",
          error instanceof Error ? error.message : "The queued message could not be cancelled.",
        );
      } finally {
        releaseEditingQueuedMessage(message.messageId);
        setBusyMessageId(null);
      }
    },
    [props],
  );

  const confirmRemove = useCallback(
    (message: QueuedThreadMessage) => {
      const confirm = () => void remove(message);
      if (Platform.OS === "ios") {
        Alert.alert("Cancel queued message?", "This message will not be sent.", [
          { text: "Keep", style: "cancel" },
          { text: "Cancel message", style: "destructive", onPress: confirm },
        ]);
        return;
      }
      showConfirmDialog({
        title: "Cancel queued message?",
        message: "This message will not be sent.",
        cancelText: "Keep",
        confirmText: "Cancel message",
        destructive: true,
        onConfirm: confirm,
      });
    },
    [remove],
  );

  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
    >
      <View className="flex-1 bg-sheet" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center justify-between border-b border-border px-5 py-3">
          <View className="min-w-0 flex-1 pr-3">
            <Text className="text-lg font-t3-bold">Queued messages</Text>
            <Text className="text-xs text-foreground-muted">
              Sent in order when this thread is ready
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Close queued messages"
            accessibilityRole="button"
            className="rounded-full bg-subtle px-4 py-2 active:opacity-70"
            onPress={close}
          >
            <Text className="text-sm font-t3-bold">Done</Text>
          </Pressable>
        </View>
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-3 px-5 py-4"
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}
        >
          {props.messages.map((message, index) => {
            const editing = message.messageId === editingMessageId;
            const busy = message.messageId === busyMessageId;
            return (
              <View
                key={message.messageId}
                className="gap-3 rounded-[20px] border border-border bg-card p-4"
              >
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="text-xs font-t3-bold text-foreground-muted">
                    Message {index + 1}
                  </Text>
                  {message.attachments.length > 0 ? (
                    <Text className="text-xs text-foreground-muted">
                      {message.attachments.length} attachment
                      {message.attachments.length === 1 ? "" : "s"}
                    </Text>
                  ) : null}
                </View>
                {editing ? (
                  <TextInput
                    autoFocus
                    multiline
                    editable={!busy}
                    value={draftText}
                    onChangeText={setDraftText}
                    textAlignVertical="top"
                    className="min-h-[112px]"
                  />
                ) : (
                  <Text selectable className="text-sm leading-normal" numberOfLines={6}>
                    {message.text || "Attachment-only message"}
                  </Text>
                )}
                <View className="flex-row justify-end gap-2">
                  {editing ? (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        disabled={busy}
                        className="rounded-full bg-subtle px-4 py-2 active:opacity-70"
                        onPress={stopEditing}
                      >
                        <Text className="text-sm font-t3-bold">Discard edit</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        disabled={busy || !queuedMessageCanSave(message, draftText)}
                        className="rounded-full bg-primary px-4 py-2 active:opacity-70 disabled:opacity-40"
                        onPress={() => void saveEditing()}
                      >
                        <Text className="text-sm font-t3-bold text-primary-foreground">Save</Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        disabled={busy || editingMessageId !== null}
                        className="rounded-full bg-subtle px-4 py-2 active:opacity-70 disabled:opacity-40"
                        onPress={() => beginEditing(message)}
                      >
                        <Text className="text-sm font-t3-bold">Edit</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        disabled={busy || editingMessageId !== null}
                        className="rounded-full bg-danger/10 px-4 py-2 active:opacity-70 disabled:opacity-40"
                        onPress={() => confirmRemove(message)}
                      >
                        <Text className="text-sm font-t3-bold text-danger-foreground">Cancel</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}
