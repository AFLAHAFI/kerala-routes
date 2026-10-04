import test from "node:test";
import assert from "node:assert/strict";
import { move, blocked, LIMITS } from "../shared/world";
import {
  validInput,
  cleanName,
  createPlayer,
  step,
} from "../server/src/simulation";
test("movement cannot pass through the terminal, even with a long frame", () => {
  let p = { x: 33, z: 15 };
  for (let i = 0; i < 100; i++) p = move(p, 0, 1, true, 0.05);
  assert.ok(p.z < 24.13);
  assert.equal(blocked(p.x, p.z), false);
});
test("diagonal movement is normalized; sprint has a bounded speed", () => {
  const p = move({ x: 0, z: 0 }, 1, 1, true, 1);
  assert.ok(Math.abs(Math.hypot(p.x, p.z) - 7.2) < 1e-6);
});
test("walkable world bounds prevent walking into deep sea", () => {
  const p = move({ x: -98, z: 0 }, -1, 0, true, 10);
  assert.ok(p.x >= LIMITS.minX && p.x < LIMITS.minX + 1);
});
test("invalid / non-finite payloads and malformed identities rejected", () => {
  for (const a of [
    null,
    {},
    { seq: 1, x: NaN, z: 0, sprint: false },
    { seq: 1, x: Infinity, z: 0, sprint: false },
    { seq: -1, x: 0, z: 0, sprint: false },
    { seq: 1, x: 999, z: 0, sprint: false },
  ])
    assert.equal(validInput(a), false);
  assert.equal(validInput({ seq: 1, x: 0.5, z: -0.5, sprint: false }), true);
  assert.equal(cleanName("<b>Aflah</b>"), "bAflahb");
  assert.equal(cleanName(null), "");
  assert.ok(cleanName("A".repeat(100)).length <= 18);
});
test("server step clamps simulation duration and applies only input", () => {
  const p = createPlayer("a", "Aflah", 0),
    x = p.x;
  step(p, { seq: 1, x: 1, z: 0, sprint: true }, 10);
  assert.ok(p.x - x <= 0.361);
  assert.equal(p.seq, 1);
});
