export function radToDeg(radians: number) {
    var pi = Math.PI;
    return radians * (180 / pi);
}

export function degToRad(degrees: number) {
    var pi = Math.PI;
    return degrees * (pi / 180);
}

export class Vector {
    x: number
    y: number

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    dist(other: Vector) {
        return Math.sqrt(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2));
    }

    add(other: Vector) {
        this.x += other.x
        this.y += other.y
        return this
    }

    sub(other: Vector) {
        this.x -= other.x
        this.y -= other.y
        return this
    }

    mult(scalar: number) {
        this.x *= scalar
        this.y *= scalar
        return this
    }

    div(scalar: number) {
        this.x /= scalar
        this.y /= scalar
        return this
    }

    copy() {
        return new Vector(this.x, this.y)
    }

    rotate(deg: number) {
        const theta = degToRad(deg);

        const cs = Math.cos(theta);
        const sn = Math.sin(theta);

        const tmpX = this.x * cs - this.y * sn;
        this.y = this.x * sn + this.y * cs;
        this.x = tmpX
        return this
    }

    normalize() {
        const mag = this.mag()
        this.y /= mag;
        this.x /= mag;
        return this
    }

    heading() {
        return radToDeg(Math.atan2(this.y, this.x))
    }

    mag() {
        return Math.sqrt((this.x * this.x) + (this.y * this.y))
    }

    angleBetween(other: Vector) {
        const a1 = Math.atan2(this.y, this.x)
        const a2 = Math.atan2(other.y, other.x)

        return Math.abs(a1 - a2)
    }
}

export const isVector = (value: any): value is Vector => {
    return (
        !value === false &&
        "x" in value &&
        "y" in value
    )
}

export default Vector