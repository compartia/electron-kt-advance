

export function zeroIfNull(val: any): number {
    if (val == undefined)
        return 0;
    if (val == null)
        return 0;
    return parseInt(val);
}


