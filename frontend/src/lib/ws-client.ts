"use client";

import { getWsUrl } from "@/lib/api";

type MessageHandler = (data: unknown) => void;

type WsClientOptions = {
  token: string;
  onMessage: MessageHandler;
  onUnauthorized?: () => void;
};

export class WsClient {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private closedByClient = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly opts: WsClientOptions) {}

  connect(): void {
    this.closedByClient = false;
    const url = new URL(getWsUrl());
    url.searchParams.set("token", this.opts.token);
    this.socket = new WebSocket(url.toString());
    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
    };
    this.socket.onmessage = (event) => {
      try {
        this.opts.onMessage(JSON.parse(event.data));
      } catch {
        this.opts.onMessage(event.data);
      }
    };
    this.socket.onclose = (event) => {
      if (event.code === 4401) {
        this.opts.onUnauthorized?.();
        return;
      }
      if (!this.closedByClient) {
        this.scheduleReconnect();
      }
    };
    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  close(): void {
    this.closedByClient = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  private scheduleReconnect(): void {
    const waitMs = Math.min(1000 * 2 ** this.reconnectAttempts, 15000);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => this.connect(), waitMs);
  }
}
