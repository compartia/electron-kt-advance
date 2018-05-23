import { isAbsolute, join, normalize, relative } from 'path';
import * as json from '../data/jsonformat';


export function pushUnique<X>(arr: Array<X>, el: X) {
    if (arr.indexOf(el) < 0)
        arr.push(el);
}


export function normalizeSourcePath(projectDir: string, sourceBase: string, loc: json.JLocation): string {
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