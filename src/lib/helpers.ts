import Vector from "./vector"

export const getMaxDist = (vectors: Vector[], position: Vector) => {
    return vectors.reduce((maxDist, checkpoint) => {
        const dist = checkpoint.dist(position)
        return dist > maxDist ? dist : maxDist
    }, 0)
}


export const flatten = (vectors: Vector[]): number[] => {
    return vectors.reduce((acc: number[], v: Vector) => {
        return [...acc, v.x, v.y]
    }, [])
}

export const mapValue = (value: number, startMin: number, startMax: number, targetMin: number, targetMax: number) => {
    //const v1 = value / (startMax - startMin)
    //return v1 * (targetMax - targetMin)
    return (value - startMin) * (targetMax - targetMin) / (startMax - startMin) + targetMin;
}

export const translate = (vectors: Vector[], center: Vector) => {
    return vectors.map(c => c.sub(center))
}

export const rotate = (vectors: Vector[], angle: number) => {
    return vectors.map(c => c.rotate(angle))
}

export const scale = (vectors: Vector[]) => {
    const maxDist = getMaxDist(vectors, new Vector(0, 0))
    return vectors.map(c => c.div(maxDist))
}

export const randomArray = (n: number) => {
    const arr = []
    for (let i = 0; i < n; i++) {
        arr.push(Math.random())
    }
    return arr
}


export const otherAgentAsInput = (agentPos: Vector, agentHeading: Vector, otherAgentPos: Vector) => otherAgentPos.copy().sub(agentPos).rotate(-agentHeading.heading())
