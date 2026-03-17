import { useState, useEffect } from 'react';
import { X, Folder, FileVideo, ChevronRight, Home } from 'lucide-react';
import { buildApiUrl } from '../config/runtime';

interface FileBrowserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (path: string) => void;
}

interface FileItem {
    name: string;
    path: string;
    isDirectory: boolean;
    isVideo: boolean;
}

interface BrowserResponse {
    currentDir: string;
    parentDir: string;
    files: FileItem[];
}

export const FileBrowserModal = ({ isOpen, onClose, onSelect }: FileBrowserModalProps) => {
    const [currentPath, setCurrentPath] = useState('');
    const [data, setData] = useState<BrowserResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadDir = async (dir: string) => {
        setLoading(true);
        setError(null);
        try {
            const url = buildApiUrl(`/api/files?dir=${encodeURIComponent(dir)}`);
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to load directory');
            const json = await res.json();
            setData(json);
            setCurrentPath(json.currentDir);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadDir(''); // Load root/home initially
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 rounded-xl w-full max-w-3xl border border-slate-700 shadow-2xl flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Folder className="w-5 h-5 text-indigo-400" />
                        Select Video File
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Breadcrumbs / Path */}
                <div className="p-3 bg-slate-800/50 border-b border-slate-700 flex items-center gap-2 text-sm text-slate-300 font-mono overflow-x-auto whitespace-nowrap">
                    <button onClick={() => loadDir('')} className="hover:text-white p-1">
                        <Home className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                    <span>{currentPath}</span>
                </div>

                {/* File List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="flex justify-center items-center h-40 text-slate-500">
                            Loading...
                        </div>
                    ) : error ? (
                        <div className="flex flex-col justify-center items-center h-40 text-red-400 gap-2">
                            <span>{error}</span>
                            <button onClick={() => loadDir(currentPath)} className="text-xs bg-slate-800 px-3 py-1 rounded">Retry</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-1">
                            {data?.parentDir && (
                                <button
                                    onClick={() => loadDir(data.parentDir)}
                                    className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded text-left transition-colors group"
                                >
                                    <Folder className="w-5 h-5 text-slate-500 group-hover:text-indigo-400" />
                                    <span className="text-slate-400 group-hover:text-white">.. (Parent Directory)</span>
                                </button>
                            )}

                            {data?.files.map((file) => (
                                <button
                                    key={file.path}
                                    onClick={() => {
                                        if (file.isDirectory) {
                                            loadDir(file.path);
                                        } else if (file.isVideo) {
                                            onSelect(file.path);
                                        }
                                    }}
                                    className={`flex items-center gap-3 p-3 rounded text-left transition-colors ${file.isDirectory
                                        ? 'hover:bg-slate-800'
                                        : file.isVideo
                                            ? 'hover:bg-indigo-900/30 cursor-pointer'
                                            : 'opacity-50 cursor-default'
                                        }`}
                                >
                                    {file.isDirectory ? (
                                        <Folder className="w-5 h-5 text-slate-500" />
                                    ) : (
                                        <FileVideo className={`w-5 h-5 ${file.isVideo ? 'text-cyan-400' : 'text-slate-600'}`} />
                                    )}
                                    <span className={`flex-1 truncate ${file.isVideo ? 'text-white' : 'text-slate-400'}`}>
                                        {file.name}
                                    </span>
                                    {file.isVideo && (
                                        <span className="text-xs bg-indigo-600 px-2 py-1 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                            Select
                                        </span>
                                    )}
                                </button>
                            ))}

                            {data?.files.length === 0 && (
                                <div className="text-center p-8 text-slate-500 italic">Example empty folder</div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-3 border-t border-slate-800 text-xs text-slate-500 text-center bg-slate-950/30">
                    Only .mp4 files are selectable for Shorts publishing.
                </div>
            </div>
        </div>
    );
};
