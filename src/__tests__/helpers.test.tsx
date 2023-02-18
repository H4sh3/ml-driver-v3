import { flatten, getMaxDist, mapValue, scale, rotate, translate } from "../lib/helpers";
import Vector from "../lib/vector";

it('test helper maxDist', () => {
    const position = new Vector(0, 0)
    const v1 = new Vector(0, 100)
    const v2 = new Vector(0, 1020)
    const v3 = new Vector(250, 0)
    const vectors: Vector[] = [v1, v2, v3]

    expect(getMaxDist(vectors, position)).toBe(1020)

    const normalized = scale(vectors)
    expect(normalized.every(n => n.x >= -1 && n.x <= 1 && n.y >= -1 && n.y <= 1)).toBeTruthy()

    const flat = flatten(vectors)
    expect(flat[0]).toBe(0)
    expect(flat[1]).toBe(100)
    expect(flat[3]).toBe(1020)
    expect(flat[4]).toBe(250)
});

it('test mapValue', () => {
    expect(mapValue(50, 0, 100, 0, 200)).toBe(100)
})


it('test vector transposed and rotate 1', () => {
    const pos = new Vector(100, 0)
    const c1 = new Vector(150, 0)

    const transposed = translate([c1], pos)
    expect(transposed[0].x).toBe(50)
    expect(transposed[0].y).toBe(0)

    let direction = new Vector(1, 0)
    let rotated = rotate(transposed, -direction.heading())
    expect(rotated[0].heading()).toBeCloseTo(0)

    direction = new Vector(-1, 0)
    rotated = rotate(transposed, -direction.heading())
    expect(rotated[0].heading()).toBeCloseTo(-180)

    direction = new Vector(-1, 0.01)
    rotated = rotate(transposed, direction.heading())
    expect(rotated[0].heading()).toBeCloseTo(-0.572)
})

it('test vector transposed and rotate 2', () => {
    const pos = new Vector(-100, 0)
    const c1 = new Vector(-100, -50)

    const transposed = translate([c1], pos)
    expect(transposed[0].x).toBe(0)
    expect(transposed[0].y).toBe(-50)

    let direction = new Vector(0, -1)
    let rotated = rotate(transposed, -direction.heading())
    expect(rotated[0].heading()).toBeCloseTo(0)

    direction = new Vector(-1, 0)
    rotated = rotate(transposed, -direction.heading())
    expect(rotated[0].heading()).toBeCloseTo(-180)

    direction = new Vector(-1, 0.01)
    rotated = rotate(transposed, direction.heading())
    expect(rotated[0].heading()).toBeCloseTo(-0.572)
})