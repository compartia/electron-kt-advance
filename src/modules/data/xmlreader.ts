import { CAnalysis } from '../common/xmltypes';
import { ProgressTracker } from '../tf_graph_common/lib/common';
import { FileSystem } from '../common/filesystem';

export interface XmlReader {    
    readDir(fs: FileSystem, tracker: ProgressTracker): Promise<CAnalysis>;
}