"use client";

import {
  db,
  collection,
  query,
  where,
  onSnapshot,
  type QueryConstraint,
} from "./firebase";
import type { DocumentData, QuerySnapshot } from "firebase/firestore";

type SnapshotCallback = (snap: QuerySnapshot<DocumentData>) => void;

interface ListenerEntry {
  unsub: () => void;
  subscribers: Set<SnapshotCallback>;
  lastSnapshot: QuerySnapshot<DocumentData> | null;
}

/**
 * Singleton listener manager.
 * One Firestore onSnapshot per unique query key, shared across all subscribers.
 */
class ListenerManager {
  private listeners = new Map<string, ListenerEntry>();

  subscribe(
    key: string,
    collectionName: string,
    constraints: QueryConstraint[],
    callback: SnapshotCallback
  ): () => void {
    const existing = this.listeners.get(key);
    if (existing) {
      existing.subscribers.add(callback);
      // Immediately replay last snapshot if available
      if (existing.lastSnapshot) {
        callback(existing.lastSnapshot);
      }
      return () => this.unsubscribe(key, callback);
    }

    const q = query(collection(db, collectionName), ...constraints);
    const subscribers = new Set<SnapshotCallback>([callback]);
    const entry: ListenerEntry = {
      unsub: () => {},
      subscribers,
      lastSnapshot: null,
    };

    entry.unsub = onSnapshot(q, (snap) => {
      entry.lastSnapshot = snap;
      for (const cb of entry.subscribers) {
        cb(snap);
      }
    });

    this.listeners.set(key, entry);
    return () => this.unsubscribe(key, callback);
  }

  private unsubscribe(key: string, callback: SnapshotCallback): void {
    const entry = this.listeners.get(key);
    if (!entry) return;
    entry.subscribers.delete(callback);
    if (entry.subscribers.size === 0) {
      entry.unsub();
      this.listeners.delete(key);
    }
  }
}

export const listenerManager = new ListenerManager();
