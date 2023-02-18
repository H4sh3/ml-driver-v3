import { Agent } from "../lib/agent";
import Vector from "../lib/vector";

it('agent test', () => {
    const start = new Vector(0, 0)
    const direction = new Vector(1, 0)
    const a = new Agent(start, direction)

    expect(a.pos.x).toBe(0)
    expect(a.pos.y).toBe(0)

    a.update(0, 1)

    expect(a.pos.x).toBe(0)
});