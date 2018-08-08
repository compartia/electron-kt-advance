import { CAnalysis } from '../common/xmltypes';
import { ProgressTracker } from '../tf_graph_common/lib/common';
import { FileSystem } from '../common/filesystem';
import { CProject } from '../common/globals';

export interface XmlReader {    
    readDir(project: CProject, tracker: ProgressTracker): Promise<CAnalysis>;
}