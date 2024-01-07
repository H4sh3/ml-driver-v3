import { Vector } from "p5"
import { Agent } from "./agent"
import { Environment, PowerupType } from "./environment"
import { getInputs, steeringActions, accActions } from "./gym"
import { mapValue } from "./helpers"
import NeuralNetwork from "./nn"

class Race {
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

    finished() {
        const failed = !this.agents.find(a => a.alive)
        const outOfTime = this.step >= this.maxSteps
        return failed || outOfTime
    }

    handleCollisions() {
        // collisions
        const moveOps: MoveOp[] = []
        for (let i = 0; i < this.agents.length; i++) {
            for (let j = 0; j < this.agents.length; j++) {
                if (i == j) continue

                const a1 = this.agents[i]
                const a2 = this.agents[j]

                if (a1.pos.dist(a2.pos) > 5) continue

                const a1VelMag = a1.vel.mag()
                const a2VelMag = a2.vel.mag()

                if (a1VelMag > a2.vel.mag()) {
                    if (moveOps.find(op => op.agent === a2)) continue
                    moveOps.push({
                        agent: a2,
                        move: a2.pos.copy().sub(a1.pos).normalize().mult(a1VelMag)
                    })
                } else {
                    if (moveOps.find(op => op.agent === a1)) continue
                    moveOps.push({
                        agent: a1,
                        move: a1.pos.copy().sub(a2.pos).normalize().mult(a2VelMag)
                    })
                }
            }
        }

        moveOps.forEach(op => {
            op.agent.vel.add(op.move)
        })
    }

    updateAgent(agent: Agent, neuralNet: NeuralNetwork) {

        const { inputs, checkpoints, rotated } = getInputs(this.environment, agent)
        const others = this.agents.filter(a => a != agent)
        const otherPosInputs = otherAgentsToInput(agent, others)
        const powerUpsAsInput = powerupsToInput(agent, this.environment.powerups)
        const agentHasPowers = [agent.hasBoosterPowerup ? 1 : 0, agent.hasRocketPowerup ? 1 : 0]
        const velMagInput = mapValue(agent.vel.mag(), 0, this.maxVelMag, 0, 1)

        //  ...otherPosInputs, // , ...powerUpsAsInput
        let action = neuralNet.predict([velMagInput, ...inputs, ...agentHasPowers, agent.boosterTicks > 0 ? 1 : 0])
        /*
        const combinedInputs = [velMagInput, ...inputs, ...powerUpsAsInput, ...agentHasPowers, agent.boosterTicks > 0 ? 1 : 0]
        let actions = neuralNet.feedForward(combinedInputs)
        const action = actions.indexOf(Math.max(...actions))
        */

        let steeringChange = 0
        let accChange = 0
        let boosting = false

        if (action <= steeringActions.length - 1) {
            steeringChange = steeringActions[action]
        } else if (action > steeringActions.length - 1 && action < actions.length - 3) {
            accChange = accActions[action - steeringActions.length]
        } else if (action == actions.length - 2) {
            if (agent.activateBooster()) {
                agent.score += 5
                boosting = true
            }
        }

        agent.update(steeringChange, accChange, boosting)


        // update score if agent is close to target
        const dist = agent.pos.dist(checkpoints[0])
        const reachedCheckpoint = dist < 40

        agent.nextCpPos = checkpoints[0]

        if (reachedCheckpoint) {
            agent.ticksSinceLastCheckpoint = 0
            agent.reachedCheckpoints += 1

            if (agent.reachedCheckpoints > 0 && agent.reachedCheckpoints % this.environment.checkpoints.length == 0) {

                const rankedAgents = [...this.agents].sort((a, b) => a.reachedCheckpoints > b.reachedCheckpoints ? -1 : 1)

                agent.score += 100
            }
        }

        // powerups
        const validPowerup = this.environment.powerups.filter(p => p.isAvailable()).find(p => p.pos.dist(agent.pos) < 15)
        if (validPowerup) {
            validPowerup.coolDown = 250
            agent.hasBoosterPowerup = true
            const pType = validPowerup.getType()
            if (pType == PowerupType.Booster) {
                // agent.hasBoosterPowerup = true
                agent.boosterTicks = 100
            }
            if (pType == PowerupType.Rocket) {
                agent.hasRocketPowerup = true
            }
        }

        return rotated
    }

    run() {
        let rotatedA0: Vector[] = []

        for (let i = 0; i < this.agents.length; i++) {
            const agent = this.agents[i]
            if (!agent.alive) continue

            const neuralNet = this.neuralNets[i]
            let r = this.updateAgent(agent, neuralNet)
            if (i == 0) {
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

    reset() {
        this.booscount = 0
        this.step = 0
        const { startPositions } = this.environment.getStartSettings()
        startPositions.sort((a, b) => 0.5 - Math.random());
        this.agents.forEach((a, i) => {
            a.startPos = startPositions[i]
            a.reset()
        })
        this.environment.powerups.forEach(p => p.coolDown = 0)
    }

}
