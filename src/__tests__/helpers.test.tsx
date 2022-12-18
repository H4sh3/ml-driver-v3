import { flattenVectors, getMaxDist, mapValue, normalizeVectors } from "../lib/helpers";
import Vector from "../lib/vector";

it('test helper maxDist', () => {
    const position = new Vector(0, 0)
    const v1 = new Vector(0, 100)
    const v2 = new Vector(0, 1020)
    const v3 = new Vector(250, 0)
    const vectors: Vector[] = [v1, v2, v3]

    expect(getMaxDist(vectors, position)).toBe(1020)

    const normalized = normalizeVectors(vectors)
    expect(normalized.every(n => n.x >= -1 && n.x <= 1 && n.y >= -1 && n.y <= 1)).toBeTruthy()

    const flat = flattenVectors(vectors)
    expect(flat[0]).toBe(0)
    expect(flat[1]).toBe(100)
    expect(flat[3]).toBe(1020)
    expect(flat[4]).toBe(250)
});

it('test mapValue', () => {
    expect(mapValue(50, 0, 100, 0, 200)).toBe(100)
})


it('test vector relative to direction and position', () => {
    const pos = new Vector(100, 0)
    const direction = new Vector(1, 0)
    const c1 = new Vector(150, 0)



    const relativePos = c1.copy().sub(pos)
    expect(relativePos.x).toBe(50)
    expect(relativePos.y).toBe(0)

    expect(direction.heading()).toBe(0)
    const rotated = relativePos.rotate(-direction.heading())
    expect(rotated.x).toBe(50)
    expect(rotated.y).toBe(0)

})

it('test vector relative to direction and position v2', () => {
    const pos = new Vector(100, 0)
    const direction = new Vector(0, 1)
    const c1 = new Vector(150, 0)


    const relativePos = c1.copy().sub(pos)
    expect(relativePos.x).toBe(50)
    expect(relativePos.y).toBe(0)


    expect(direction.heading()).toBe(90)
    const rotated = relativePos.rotate(-direction.heading())
    expect(rotated.x).toBeCloseTo(0)
    expect(rotated.y).toBe(-50)
})

it('test vector relative to direction and position v3', () => {
    const pos = new Vector(50, -150)
    const direction = new Vector(0, -1)
    const c1 = new Vector(75, -200)


    const relativePos = c1.copy().sub(pos)
    expect(relativePos.x).toBe(25)
    expect(relativePos.y).toBe(-50)


    expect(direction.heading()).toBe(-90)
    const rotated = relativePos.rotate(-direction.heading())
    expect(rotated.x).toBeCloseTo(50)
    expect(rotated.y).toBeCloseTo(25)
})