import { Agent } from "../lib/agent";
import { Environment } from "../lib/environment";
import { getInputs } from "../lib/gym";

it('agent test', () => {
    const environment = new Environment(false)
    environment.initCircleTrack()

    let { startPos, startDir } = environment.getStartSettings()
    let agent = new Agent(startPos, startDir)
    const { inputs: i1 } = getInputs(environment, agent)

    const settings2 = environment.getStartSettings()
    agent = new Agent(settings2.startPos, settings2.startDir)
    const { inputs: i2 } = getInputs(environment, agent)

    i1.every((v, index) => expect(v).toBeCloseTo(i2[index]))
});