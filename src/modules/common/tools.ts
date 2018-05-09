
export function pushUnique<X>(arr: Array<X>, el: X) {
    if (!arr.includes(el))
        arr.push(el);
}