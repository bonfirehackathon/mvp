export function raise(e: any): never {
    throw e;
}

export function raiseNPE(): never {
    raise("Null reference");
}

export function notNull<T>(t: T): NonNullable<T> {
    return t ?? raise("Null reference");
}

export function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
    return value !== null && value !== undefined;
}

export type Either<E, V> = { e: false, v: V } | { e: true, v: E }

export function I<T>(t: T): T {
    return t;
}

export function left<E, V>(err: E): Either<E, V> {
	return { e: true, v: err }
}
export function right<E, V>(val: V): Either<E, V> {
	return { e: false, v: val }
}

export function bind<E, V, R>(v: Either<E, V>, action: (v: V) => R): Either<E, R> {
    if (v.e) {
        return left(v.v);
    }
    return right(action(v.v));
}

export function bindT<E, V, R>(v: Either<E, V>, action: (v: V) => Either<E, R>): Either<E, R> {
    if (v.e) {
        return left(v.v);
    }
    const res = action(v.v);
    if (res.e) {
        return left(res.v);
    }
    return right(res.v);
}

export async function bindA<E, V, R>(v: Either<E, V>, action: (v: V) => Promise<R>): Promise<Either<E, R>> {
    if (v.e) {
        return left(v.v);
    }
    return right(await action(v.v));
}

export async function bindTA<E, V, R>(v: Either<E, V>, action: (v: V) => Promise<Either<E, R>>): Promise<Either<E, R>> {
    if (v.e) {
        return left(v.v);
    }
    const res = await action(v.v);
    if (res.e) {
        return left(res.v);
    }
    return right(res.v);
}

export function bind2<E, V, RE, RV>(v: Either<E, V>, lAction: (e: E) => RE, rAction: (v: V) => RV): Either<RE, RV> {
    if (v.e) {
        return left(lAction(v.v));
    }
    return right(rAction(v.v));
}

export function bind2T<E, V, RE, RV>(v: Either<E, V>, lAction: (e: E) => RE, rAction: (v: V) => Either<RE, RV>): Either<RE, RV> {
    if (v.e) {
        return left(lAction(v.v));
    }
    const res = rAction(v.v);
    if (res.e) {
        return left(res.v);
    }
    return right(res.v);
}

export async function bind2TA<E, V, RE, RV>(v: Either<E, V>, lAction: (e: E) => Promise<RE>, rAction: (v: V) => Promise<Either<RE, RV>>): Promise<Either<RE, RV>> {
    if (v.e) {
        return left(await lAction(v.v));
    }
    const res = await rAction(v.v);
    if (res.e) {
        return left(res.v);
    }
    return right(res.v);
}