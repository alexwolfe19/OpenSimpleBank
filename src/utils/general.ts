export function isnull<T>(value: T) {
    return (value == null || value == undefined);
}

export function assert<T>(value: T, message?: string): T {
    if (isnull(value)) throw new Error(message);
    return value;
}

export function safelyAssert<T>(value: T, defval: T): T {
    if (isnull(value)) return defval;
    return value;
}

export function ifndef<T>(value: T, callback: () => void) : T | void {
    if (isnull(value)) return callback();
    return value;
}

export function defaultsTo<T>(value: T, defval: T): T {
    if (isnull(value)) return defval;
    return value;
}