
export function pushUnique<X>(arr: Array<X>, el: X) {
    if (arr.indexOf(el) < 0)
        arr.push(el);
}