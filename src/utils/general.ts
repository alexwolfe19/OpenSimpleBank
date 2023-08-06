export function assert<T>(value: T, message?: string): T {
    if (value == null || value == undefined) throw new Error(message);
    return value;
}

export function safelyAssert<T>(value: T, defval: T): T {
    if (value == null || value == undefined) return defval;
    return value;
}

export function ifndef<T>(value: T, callback: () => void) : T | void {
    if (value == null || value == undefined) return callback();
    return value;
}