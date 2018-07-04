import { isAbsolute, join, normalize, relative } from 'path';
import { JLocation } from '../../generated/kt-json';
 


export function pushUnique<X>(arr: Array<X>, el: X) {
    if (arr.indexOf(el) < 0)
        arr.push(el);
}


export function normalizeSourcePath(projectDir: string, sourceBase: string, loc: JLocation): string {
    //todo: xxx: this is called too often for large projects

    /*
        typically it is "semantics/sourcefiles"
    */
    const sourceBaseRelative = relative(projectDir, sourceBase);

    if (!!loc) {
        if (isAbsolute(loc.file)) {
            return normalize(loc.file);
        } else {
            return normalize(join(sourceBaseRelative, loc.file));
        }

    }
    return normalize(join(sourceBaseRelative, "_unknown_"));
}