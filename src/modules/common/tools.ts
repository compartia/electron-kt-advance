import { join, normalize, relative } from 'path';
import * as json from '../data/jsonformat';


export function pushUnique<X>(arr: Array<X>, el: X) {
    if (arr.indexOf(el) < 0)
        arr.push(el);
}


export function normalizeSourcePath(projectDir: string, base: string, loc: json.JLocation): string {
    let abs = join(base, "_unknown_");
    if (!!loc) {
        abs = normalize(join(base, loc.file));
    }

    let relativePath = relative(projectDir, abs);
    return relativePath;
}