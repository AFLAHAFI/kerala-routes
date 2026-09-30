import {SnapshotDecoder} from '../shared/snapshots';
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { io, Socket } from "socket.io-client";
import type { Snapshot, Welcome } from "../shared/types";
const sleep = (n: number) => new Promise((r) => setTimeout(r, n));
test(
  "shared room: synchronization, server validation, 12-player capacity, departure and reconnect",
  { timeout: 20000 },
  async () => {
    const port = 3189,
      server = spawn(
        process.execPath,
        ["--import", "tsx", "server/src/index.ts"],
        {
          env: { ...process.env, PORT: String(port), NODE_ENV: "production" },
          stdio: "pipe",
        },
      );
    let output = "";
    server.stderr.on("data", (d) => (output += d));
    server.stdout.on("data", (d) => (output += d));
    const sockets: Socket[] = [];
    const states = new Map<string, Snapshot>();
    const join = async (name: string) => {
      const s = io(`http://127.0.0.1:${port}`, {
        reconnection: false,
        timeout: 4000,
      });
      sockets.push(s);
      const decoder=new SnapshotDecoder();s.on("snapshot", (v:any) => states.set(name,decoder.decode(v)));
      return new Promise<{
        s: Socket;
        result: { ok: boolean; message?: string; welcome?: Welcome };
      }>((resolve, reject) => {
        s.on("connect_error", reject);
        s.on("connect", () =>
          s.emit("join", { name,token:Buffer.from(name).toString("hex").padEnd(64,"0").slice(0,64) }, (result: any) => {if(result.ok)decoder.reset({...result.welcome,events:[]});resolve({ s, result });}),
        );
      });
    };
    try {
      let ready = false;
      for (let i = 0; i < 50; i++) {
        try {
          const r = await fetch(`http://127.0.0.1:${port}/health`);
          if (r.ok) {
            ready = true;
            break;
          }
        } catch {}
        await sleep(100);
      }
      assert.ok(ready, output);
      const a = await join("AFLAH"),
        b = await join("TEST02");
      assert.equal(a.result.ok, true);
      assert.equal(b.result.ok, true);
      const aid = a.result.welcome!.id;
      let seq = 0;
      const start = a.result.welcome!.players.find((p) => p.id === aid)!;
      for (let i = 0; i < 20; i++) {
        a.s.emit("input", { seq: ++seq, x: 1, z: 0, sprint: false });
        await sleep(50);
      }
      await sleep(100);
      const remote = states.get("TEST02")!.players.find((p) => p.id === aid)!;
      assert.ok(remote.x > start.x + 2.5);
      assert.ok(remote.x < start.x + 5.5);
      const before = remote.x;
      a.s.emit("input", { seq: ++seq, x: 9999, z: 0, sprint: true });
      a.s.emit("input", {
        seq: ++seq,
        x: 0,
        z: 0,
        sprint: false,
        points: 99999,
      });
      await sleep(400);
      const after = states.get("TEST02")!.players.find((p) => p.id === aid)!;
      assert.ok(Math.abs(after.x - before) < 1);
      assert.equal((after as any).points, undefined);
      for (let i = 0; i < 10; i++)
        assert.equal((await join("Guest" + i)).result.ok, true);
      const full = await join("Overflow");
      assert.equal(full.result.ok, false);
      full.s.disconnect();
      a.s.disconnect();
      await sleep(200);
      assert.equal(
        states.get("TEST02")!.players.some((p) => p.id === aid),
        false,
      );
      assert.equal(states.get("TEST02")!.players.length, 11);
      const reconnect = await join("AFLAH");
      assert.equal(reconnect.result.ok, true);
      assert.equal(reconnect.result.welcome!.id, aid);
      await sleep(100);
      assert.equal(states.get("TEST02")!.players.length, 12);
      assert.equal(
        states.get("TEST02")!.players.filter((p) => p.name === "AFLAH").length,
        1,
      );
    } finally {
      sockets.forEach((s) => s.disconnect());
      server.kill("SIGTERM");
      await new Promise<void>((resolve) => {
        if (server.exitCode !== null) resolve();
        else server.once("exit", () => resolve());
      });
    }
  },
);
