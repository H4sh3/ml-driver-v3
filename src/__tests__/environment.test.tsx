import { Environment } from "../lib/environment";

it('test environment init', () => {
    const e = new Environment(36)
    expect(e.checkpoints.length).toBe(e.numCheckpoints)
    expect(e.checkpoints[0].heading()).toBe(0)
    expect(e.checkpoints[1].heading()).toBeCloseTo(10)
});