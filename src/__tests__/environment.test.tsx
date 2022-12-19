import { Environment } from "../lib/environment";

it('test environment init', () => {
    let e = new Environment()
    e.initCircleTrack()
    expect(e.checkpoints.length).toBe(e.numCheckpoints)


    e = new Environment()
    e.initSinTrack()
    expect(e.checkpoints.length).toBe(e.numCheckpoints)
});