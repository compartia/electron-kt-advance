import { XmlReader } from './xmlreader';
import { ProgressTracker } from '../tf_graph_common/lib/common';
import { CAnalysis } from '../common/xmltypes';



export interface XmlReader {
    readDir(dir: string, appPath: string, tracker: ProgressTracker): CAnalysis;
}