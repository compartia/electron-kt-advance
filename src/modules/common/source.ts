
export interface FileContents {
    lines: SourceLine[];
}

export interface SourceLine {
    index: number;
    text: string;
    stats: any;
}


export function parseSourceFile(contents: string): SourceLine[] {
    let lines = contents.split(/\r\n|\r|\n/g);
    let ret: SourceLine[] = [];
    let index: number = 1;
    for (let line of lines) {
        ret.push({
            index: index,
            text: line,
            stats: {
                violations: 0,
                open: 0
            }
        });
        index++;
    }
    return ret;
}
