import { CAnalysis } from '../common/xmltypes';
import { ProgressTracker } from '../tf_graph_common/lib/common';

export interface XmlReader {    
    readDir(dir: string, appPath: string, tracker: ProgressTracker): Promise<CAnalysis>;
}