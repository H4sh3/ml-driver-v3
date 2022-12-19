import Vector from "./vector"

export const getMaxDist = (vectors: Vector[], position: Vector) => {
    return vectors.reduce((maxDist, checkpoint) => {
        const dist = checkpoint.dist(position)
        return dist > maxDist ? dist : maxDist
    }, 0)
}

export const normalize = (vectors: Vector[]) => {
    const maxDist = getMaxDist(vectors, new Vector(0, 0))
    return vectors.map(c => c.copy()).map(c => c.div(maxDist))
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

export const transpose = (vectors: Vector[], center: Vector) => {
    return vectors.map(c => c.copy()).map(c => c.sub(center))
}

export const rotate = (vectors: Vector[], angle: number) => {
    return vectors.map(c => c.rotate(angle))
}

