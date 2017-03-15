module kt.graph.kt_graph {
    const fs = require('fs');
    const path = require('path');
    const sax = require('sax')


    export class XmlReader {

        public parsePpoXml(dirName: string, filename: string): Promise<Array<kt.graph.po_node.PONode | void>> {

            // let deferredResult = defer<Array<kt.graph.po_node.PONode>>();

            let ppos = new Array<kt.graph.po_node.PONode>();

            let strict = true;
            let parser = sax.createStream(strict);
            let functionName;

            let currentPo = {}


            parser.onopentag = (tag) => {
                if (tag.name == 'function') {
                    functionName = tag.attributes["name"];
                    console.log(functionName);
                }

                else if (tag.name == 'proof-obligation') {
                    currentPo = {
                        "id": tag.attributes["id"],
                        "functionName": functionName,
                        "level": "PRIMARY",
                        "state": "OPEN"
                    }
                }

                else if (tag.name == 'location') {
                    currentPo["file"] = tag.attributes["file"];
                    let line: number = tag.attributes["line"];
                    currentPo["textRange"] = [[line, 0], [line, 200]];
                }

                else if (tag.name == 'predicate') {
                    currentPo["predicateType"] = tag.attributes["tag"];
                }

            };

            parser.onclosetag = (tagName: string) => {
                if (tagName == 'proof-obligation') {
                    currentPo["referenceKey"] = currentPo["id"] + "::" + currentPo["functionName"] + "::" + currentPo["file"];
                    let ppoNode = new kt.graph.po_node.PONode(currentPo);
                    ppos.push(ppoNode);
                }
            }


            return new Promise((resolve, reject) => {
                let stream = fs.createReadStream(path.join(dirName, filename));
                stream.pipe(parser);

                stream.on('end', () => {
                    resolve(ppos);
                });

            });

        }

        public readDir(dirName: string): void {
            let parser = this;
            fs.readdir(dirName, function(err, items) {

                let pposPromisesArray = new Array<Promise<any>>();

                for (let item of items) {
                    if (item.endsWith("_ppo.xml")) {
                        pposPromisesArray.push(parser.parsePpoXml(dirName, item));
                    }
                }


                Promise.all(pposPromisesArray).then((arrayOfResults) => {
                    console.info("parsed "+arrayOfResults.length+" PPO files");
                })
            });
        }



    }


    export function test() {
        console.info("test");

        const paths = ["/Users/artem/work/KestrelTechnology/IN/dnsmasq/ch_analysis/src/cache/"];

        let reader: XmlReader = new XmlReader();
        reader.readDir(paths[0]);
    }
}
