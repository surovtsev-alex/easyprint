import type { EditorEvents } from "./types";

type EventHandler<T> = (data: T) => void;

export class EventBus {
  private handlers: Map<string, Set<EventHandler<unknown>>> = new Map();

  on<K extends keyof EditorEvents>(
    event: K,
    handler: EventHandler<EditorEvents[K]>
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler<unknown>);

    return () => {
      this.handlers.get(event)?.delete(handler as EventHandler<unknown>);
    };
  }

  emit<K extends keyof EditorEvents>(event: K, data: EditorEvents[K]): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  off<K extends keyof EditorEvents>(
    event: K,
    handler: EventHandler<EditorEvents[K]>
  ): void {
    this.handlers.get(event)?.delete(handler as EventHandler<unknown>);
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const eventBus = new EventBus();
