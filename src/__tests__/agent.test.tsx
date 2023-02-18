import { Agent } from "../lib/agent";
import { otherAgentAsInput } from "../lib/helpers";
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



it('should calc relative inputs for other agents 1', () => {
    const agent = new Vector(0, 0)
    const other = new Vector(1, 0)
    const direction = new Vector(1, 0)

    const res = otherAgentAsInput(agent, direction, other)
    expect(res.x).toBe(1)
    expect(res.y).toBe(0)
});

it('should calc relative inputs for other agents 2', () => {
    const agent = new Vector(-4, -4)
    const other = new Vector(-4, 2)
    const direction = new Vector(0, -1)

    const res = otherAgentAsInput(agent, direction, other)
    expect(res.x).toBe(-6)
    expect(res.y).toBeCloseTo(0)
});