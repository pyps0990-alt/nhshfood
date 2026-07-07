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
type ErrorCallback = (err: Error) => void;

interface ListenerEntry {
  unsub: () => void;
  subscribers: Set<SnapshotCallback>;
  errorSubscribers: Set<ErrorCallback>;
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
    callback: SnapshotCallback,
    onError?: ErrorCallback
  ): () => void {
    const existing = this.listeners.get(key);
    if (existing) {
      existing.subscribers.add(callback);
      if (onError) existing.errorSubscribers.add(onError);
      // Immediately replay last snapshot if available
      if (existing.lastSnapshot) {
        callback(existing.lastSnapshot);
      }
      return () => this.unsubscribe(key, callback, onError);
    }

    const q = query(collection(db, collectionName), ...constraints);
    const subscribers = new Set<SnapshotCallback>([callback]);
    const errorSubscribers = new Set<ErrorCallback>();
    if (onError) errorSubscribers.add(onError);
    const entry: ListenerEntry = {
      unsub: () => {},
      subscribers,
      errorSubscribers,
      lastSnapshot: null,
    };

    entry.unsub = onSnapshot(
      q,
      (snap) => {
        entry.lastSnapshot = snap;
        for (const cb of entry.subscribers) {
          cb(snap);
        }
      },
      (err) => {
        for (const cb of entry.errorSubscribers) {
          cb(err instanceof Error ? err : new Error(String(err)));
        }
      }
    );

    this.listeners.set(key, entry);
    return () => this.unsubscribe(key, callback, onError);
  }

  private unsubscribe(key: string, callback: SnapshotCallback, onError?: ErrorCallback): void {
    const entry = this.listeners.get(key);
    if (!entry) return;
    entry.subscribers.delete(callback);
    if (onError) entry.errorSubscribers.delete(onError);
    if (entry.subscribers.size === 0) {
      entry.unsub();
      this.listeners.delete(key);
    }
  }
}

export const listenerManager = new ListenerManager();
