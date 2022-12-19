import Vector, { radToDeg } from "../lib/vector";

it('vector add', () => {
    const v1: Vector = new Vector(10, 0)
    const v2: Vector = new Vector(10, 0)
    v1.add(v2)

    expect(v1.x).toBe(20)
    expect(v1.y).toBe(0)
});

it('vector sub', () => {
    const v1: Vector = new Vector(10, 0)
    const v2: Vector = new Vector(10, 10)
    v1.sub(v2)

    expect(v1.x).toBe(0)
    expect(v1.y).toBe(-10)
});

it('vector mult', () => {
    const v1: Vector = new Vector(5, 10)
    const scalar = 5
    v1.mult(scalar)

    expect(v1.x).toBe(25)
    expect(v1.y).toBe(50)
});

it('vector division', () => {
    let v: Vector = new Vector(10, 10)
    const l1 = v.mag()

    v.div(2)
    const l2 = v.mag()
    expect(l1).toBe(l2 * 2)
});

it('vector copy', () => {
    const v1: Vector = new Vector(5, 10)
    const v2: Vector = v1.copy()

    const scalar = 5
    v2.mult(scalar)

    expect(v1.x).toBe(5)
    expect(v1.y).toBe(10)

    expect(v2.x).toBe(25)
    expect(v2.y).toBe(50)
});

it('vector rotate', () => {
    const v1: Vector = new Vector(10, 0)

    v1.rotate(90)
    expect(v1.x).toBeCloseTo(0)
    expect(v1.y).toBeCloseTo(10)


    v1.rotate(90)
    expect(v1.x).toBeCloseTo(-10)
    expect(v1.y).toBeCloseTo(0)

    v1.rotate(90)
    expect(v1.x).toBeCloseTo(0)
    expect(v1.y).toBeCloseTo(-10)

    v1.rotate(90)
    expect(v1.x).toBeCloseTo(10)
    expect(v1.y).toBeCloseTo(0)
});

it('vector normalize', () => {
    const v1: Vector = new Vector(10, 5)
    v1.normalize()
    expect(v1.mag()).toBeCloseTo(1)

    const v2: Vector = new Vector(-5, 20)
    v2.normalize()
    expect(v2.mag()).toBeCloseTo(1)
});


it('vector heading', () => {
    let v: Vector = new Vector(10, 0)
    expect(v.heading()).toBe(0)

    v = new Vector(0, -10)
    expect(v.heading()).toBe(-90)

    v = new Vector(-10, 0)
    expect(v.heading()).toBe(180)

    v = new Vector(0, 10)
    expect(v.heading()).toBe(90)
});


it('vector mag', () => {
    let v: Vector = new Vector(10, 10)
    expect(v.mag()).toBeCloseTo(14.14)

    v = new Vector(-10, 10)
    expect(v.mag()).toBeCloseTo(14.14)

    v = new Vector(10, -10)
    expect(v.mag()).toBeCloseTo(14.14)

    v = new Vector(-10, -10)
    expect(v.mag()).toBeCloseTo(14.14)
});


it('vector chain', () => {
    let v: Vector = new Vector(10, 10)
    v.mult(5).rotate(90).sub(new Vector(1, 2))

    expect(v.x).toBe(-51)
    expect(v.y).toBe(48)
});

it('heading etc', () => {
    let v: Vector = new Vector(0, 0)
    let v1: Vector = new Vector(5, 5)
    let v2: Vector = new Vector(-5, -5)

    expect(v1.copy().sub(v).heading()).toBeCloseTo(45)
    expect(v2.copy().sub(v).heading()).toBeCloseTo(-135)
});


it('heading test', () => {
    const v1: Vector = new Vector(1, 0)
    expect(v1.heading()).toBeCloseTo(0)
    v1.y = -0.01
    expect(v1.heading()).toBeCloseTo(-0.57)
    v1.y = 0.01
    expect(v1.heading()).toBeCloseTo(0.57)

    const v2: Vector = new Vector(0, 1)
    expect(v2.heading()).toBeCloseTo(90)

    const v3: Vector = new Vector(-1, 0)
    expect(v3.heading()).toBeCloseTo(180)

    v3.y = -0.01
    expect(v3.heading()).toBeCloseTo(-179.427)

    v3.y = 0.01
    expect(v3.heading()).toBeCloseTo(179.427)


    const v4: Vector = new Vector(0, -1)
    expect(v4.heading()).toBeCloseTo(-90)
});

it('angle between vectors', () => {
    let v2: Vector = new Vector(1, 0)
    let v1: Vector = new Vector(0, -1)

    const a = Math.atan2(v2.y - v1.y, v2.x - v1.x) * 180 / Math.PI;
    expect(a).toBe(45)

    //expect(radToDeg(v1.angleBetween(v2))).toBeCloseTo(90)

    expect(radToDeg(Math.PI / 2)).toBe(90)
    expect(radToDeg(Math.PI)).toBe(180)
    expect(radToDeg(6 * (Math.PI / 4))).toBe(270)
    expect(radToDeg(2 * Math.PI)).toBe(360)
});

it('angle between vectors', () => {
    let v1 = new Vector(-1, 0)
    let v2 = new Vector(1, 0)
    expect(radToDeg(v1.angleBetween(v2))).toBe(180)
    expect(radToDeg(v2.angleBetween(v1))).toBe(180)

    v1 = new Vector(0, -1)
    v2 = new Vector(0, 1)
    expect(radToDeg(v1.angleBetween(v2))).toBe(180)
    expect(radToDeg(v2.angleBetween(v1))).toBe(180)


    v1 = new Vector(1, 0)
    v2 = new Vector(0, -1)
    expect(radToDeg(v1.angleBetween(v2))).toBe(90)
    expect(radToDeg(v2.angleBetween(v1))).toBe(90)


    v1 = new Vector(1, 0)
    v2 = new Vector(1, -1)
    expect(radToDeg(v1.angleBetween(v2))).toBe(45)
    expect(radToDeg(v2.angleBetween(v1))).toBe(45)

    v1 = new Vector(1, 0)
    v2 = new Vector(2, -1)
    expect(radToDeg(v1.angleBetween(v2))).toBeCloseTo(26.565)
    expect(radToDeg(v2.angleBetween(v1))).toBeCloseTo(26.565)
})

it("test", () => {
    const p1 = { x: 1, y: 0 }
    const p2 = { x: 0, y: 1 }
    var angleDeg = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
    expect(angleDeg).toBe(135)
})