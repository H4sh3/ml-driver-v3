import { Environment } from "../lib/environment";

it('test environment init', () => {
    const e = new Environment(36)
    expect(e.checkpoints.length).toBe(e.numCheckpoints)
    expect(e.checkpoints[0].heading()).toBe(0)
    expect(e.checkpoints[1].heading()).toBeCloseTo(10)

    expect(e.getStartPosition().heading()).toBeCloseTo(-1)

    // start at ~-1° checkpoint at 0° points down ~90°
    expect(e.getStartDirection()).toBeCloseTo(89.5)

    // test returned checkpoints based on passed checkpoints
    let checkpoints = e.getCheckpoints(3, 0)
    expect(checkpoints[0]).toBe(e.checkpoints[0])
    expect(checkpoints[1]).toBe(e.checkpoints[1])
    expect(checkpoints[2]).toBe(e.checkpoints[2])

    // check overflow
    checkpoints = e.getCheckpoints(3, 35)
    expect(checkpoints[0]).toBe(e.checkpoints[35])
    expect(checkpoints[1]).toBe(e.checkpoints[0])
    expect(checkpoints[2]).toBe(e.checkpoints[1])
});