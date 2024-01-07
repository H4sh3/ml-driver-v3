import { Agent } from "./agent"
import { accActions, actions, numAgents, steeringActions } from "./config"
import { Environment, PowerupType } from "./environment"
import { getInputs, getNN } from "./gym"
import { mapValue } from "./helpers"
import NeuralNetwork from "./nn"
import Vector from "./vector"

export class Race {
    agents: Agent[]
    neuralNets: NeuralNetwork[]
    environment: Environment
    step: number
    maxSteps: number = 1000
    maxVelMag = 1
    stopped = false
    booscount = 0


    constructor(agents: Agent[], environment: Environment, neuralNets: NeuralNetwork[]) {
        this.agents = agents
        this.environment = environment
        this.neuralNets = neuralNets
        this.step = 0
    }

    reset() {
        this.booscount = 0
        this.step = 0
        const { startPosition } = this.environment.getStartSettings()

        this.agents.forEach((a, i) => {
            a.startPos = startPosition.copy()
            a.reset()
        })

        this.environment.powerups.forEach(p => p.coolDown = 0)
    }

    finished() {
        const failed = !this.agents.find(a => a.alive)
        const outOfTime = this.step >= this.maxSteps
        return failed || outOfTime
    }

    run() {
        let rotatedA0: Vector[] = []

        for (let i = 0; i < this.agents.length; i++) {
            const agent = this.agents[i]

            if (!agent.alive) continue

            const neuralNet = this.neuralNets[i]

            let r = this.updateAgent(agent, neuralNet,i)
            
            if (i == 1) {
                rotatedA0 = r
            }
        }

        this.agents.forEach(a => {
            if (a.maxVelMag > this.maxVelMag) {
                this.maxVelMag = a.maxVelMag
            }
        })

        this.environment.updatePowerups()

        this.step++

        return rotatedA0
    }

    updateAgent(agent: Agent, neuralNet: NeuralNetwork,index:number) {
        const { inputs, checkpoints, rotated } = getInputs(this.environment, agent)
        const agentHasPowers = [agent.hasBoosterPowerup ? 1 : 0, agent.hasRocketPowerup ? 1 : 0]
        const velMagInput = mapValue(agent.vel.mag(), 0, this.maxVelMag, 0, 1)

        // predict action based on inputs
        const action = neuralNet.predict([velMagInput, ...inputs, ...agentHasPowers, agent.boosterTicks > 0 ? 1 : 0])

        agent.update(action)

        // update score if agent is close to target
        const dist = agent.pos.dist(checkpoints[0])
        const reachedCheckpoint = dist < 40

        agent.nextCpPos = checkpoints[0]

        if (reachedCheckpoint) {
            agent.ticksSinceLastCheckpoint = 0
            agent.reachedCheckpoints += 1

            if (agent.reachedCheckpoints > 0 && agent.reachedCheckpoints % this.environment.checkpoints.length == 0) {
                agent.score += 100
            }
        }

        // powerups
        const validPowerup = this.environment.powerups.find(p => p.pos.dist(agent.pos) < 15)
        if (validPowerup) {
            agent.hasBoosterPowerup = true
            const pType = validPowerup.getType()
            if (pType == PowerupType.Booster) {
                agent.boosterTicks = 100
            }
        }

        return rotated
    }
}