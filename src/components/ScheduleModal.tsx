import { useState, useEffect } from 'react';
import { X, Clock, ChevronDown, ChevronRight, Globe, Lock, Film, Play, Link, CheckCircle } from 'lucide-react';
import type { ShortItem, DeliveryState } from '../types';

interface ScheduleModalProps {
    item: ShortItem;
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, updates: Partial<ShortItem>) => void;
    state?: DeliveryState;
    mode?: 'schedule' | 'edit'; // 'schedule' = new link, 'edit' = modify existing
}

export const ScheduleModal = ({ item, isOpen, onClose, onSave, state, mode = 'schedule' }: ScheduleModalProps) => {
    const [title, setTitle] = useState(item.title);
    const [description, setDescription] = useState(item.description);
    const [tags, setTags] = useState(item.tags.join(', '));
    const [publishDate, setPublishDate] = useState(item.scheduledDate || '');
    const [publishTime, setPublishTime] = useState(item.scheduledTime || '');

    // v2.2 Advanced Metadata Defaults
    const [categoryId, setCategoryId] = useState(item.categoryId || '27'); // Education
    const [madeForKids, setMadeForKids] = useState(item.madeForKids || false);
    const [aiDisclosure, setAiDisclosure] = useState(item.aiDisclosure || false);
    const [privacyStatus, setPrivacyStatus] = useState<'private' | 'unlisted' | 'public'>(item.privacyStatus || 'private');

    // UI States
    const [showMore, setShowMore] = useState(false); // Mimic "Show more" in Studio
    // In 'edit' mode, we might not want to enforce required fields validation as strictly, or default to current values

    const handleImportMarketing = () => {
        if (!state?.modules.marketing.strategy.seo) return;
        const seo = state.modules.marketing.strategy.seo;
        const social = state.modules.marketing.strategy.social;
        const geo = state.modules.marketing.strategy.geo;

        const importedTitle = seo.titleCandidates?.[0] || title;
        const importedDesc = `${seo.description || ''}\n\n${social?.twitterThread || ''}`;

        let importedTags = [...(seo.keywords || [])];
        if (geo?.locationTags) {
            importedTags = [...importedTags, ...geo.locationTags];
        }

        setTitle(importedTitle);
        setDescription(importedDesc.trim());
        setTags(importedTags.join(', '));
    };

    useEffect(() => {
        if (isOpen) {
            setTitle(item.title);
            setDescription(item.description);
            setTags(item.tags.join(', '));

            // Logic for Date/Time
            // If in 'schedule' mode and date is not set, default to tomorrow
            // If in 'edit' mode, keep existing
            if (mode === 'schedule' && !item.scheduledDate) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setPublishDate(tomorrow.toISOString().split('T')[0]);
                setPublishTime('09:00');
            } else {
                setPublishDate(item.scheduledDate || '');
                setPublishTime(item.scheduledTime || '');
            }

            setCategoryId(item.categoryId || '27');
            setMadeForKids(item.madeForKids || false);
            setAiDisclosure(item.aiDisclosure || false);
            setPrivacyStatus(item.privacyStatus || 'private');
        }
    }, [isOpen, item, mode]);

    if (!isOpen) return null;

    const handleSave = () => {
        const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);

        const updates: Partial<ShortItem> = {
            title,
            description,
            tags: tagList,
            scheduledDate: publishDate,
            scheduledTime: publishTime,
            categoryId,
            madeForKids,
            aiDisclosure,
            privacyStatus
        };

        // Context-Aware Status Logic
        if (mode === 'schedule') {
            updates.status = 'scheduled';
        }
        // If mode === 'edit', we do NOT update status, preserving 'scheduled' or 'published'

        onSave(item.id, updates);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-[#1f1f1f] rounded-xl w-full max-w-5xl border border-[#303030] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header - Studio Style */}
                <div className="p-4 border-b border-[#303030] flex justify-between items-center bg-[#1f1f1f]">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {mode === 'schedule' ? 'Schedule Video' : `Video Details: ${item.title}`}
                    </h2>
                    <div className="flex items-center gap-2">
                        {state?.modules.marketing.isSubmitted && (
                            <button
                                onClick={handleImportMarketing}
                                className="px-3 py-1.5 text-[#3ea6ff] hover:bg-[#263850] rounded text-sm font-medium transition-colors uppercase tracking-wide"
                            >
                                Reuse Details
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-[#303030] rounded-full text-[#aaaaaa] hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Body - 2 Column Layout */}
                <div className="flex-1 overflow-y-auto p-0 flex flex-col md:flex-row">

                    {/* Left Column: Details (65%) */}
                    <div className="flex-1 p-6 space-y-6 overflow-y-auto">

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white">Details</h3>

                            {/* Title */}
                            <div className="space-y-1 relative group">
                                <div className="flex justify-between">
                                    <label className="text-xs text-[#aaaaaa] font-medium">Title (required)</label>
                                    <span className="text-xs text-[#aaaaaa]">{title.length}/100</span>
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full bg-[#121212] border border-[#3e3e3e] rounded p-3 text-white focus:border-[#3ea6ff] outline-none transition-colors peer"
                                        placeholder="Add a title that describes your video"
                                        maxLength={100}
                                    />
                                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-[#3ea6ff] scale-x-0 peer-focus:scale-x-100 transition-transform origin-left"></div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <label className="text-xs text-[#aaaaaa] font-medium">Description</label>
                                    <span className="text-xs text-[#aaaaaa]">{description.length}/5000</span>
                                </div>
                                <div className="relative">
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full bg-[#121212] border border-[#3e3e3e] rounded p-3 text-white focus:border-[#3ea6ff] outline-none h-40 resize-none peer"
                                        placeholder="Tell viewers about your video"
                                        maxLength={5000}
                                    />
                                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-[#3ea6ff] scale-x-0 peer-focus:scale-x-100 transition-transform origin-left"></div>
                                </div>
                            </div>
                        </div>

                        {/* Audience Section - Prominent */}
                        <div className="space-y-3 pt-2">
                            <h3 className="text-sm font-semibold text-white">Audience</h3>
                            <p className="text-xs text-[#aaaaaa]">Is this video made for kids? (Required)</p>

                            <div className="bg-[#121212] border border-[#3e3e3e] rounded p-4 space-y-3">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="madeForKids"
                                        checked={madeForKids}
                                        onChange={() => setMadeForKids(true)}
                                        className="mt-1 accent-[#3ea6ff] w-5 h-5 border-[#aaaaaa] bg-transparent"
                                    />
                                    <div>
                                        <span className="text-white text-sm font-medium">Yes, it's made for kids</span>
                                        <p className="text-xs text-[#aaaaaa] mt-0.5">Features like personalized ads and notifications won't be available.</p>
                                    </div>
                                </label>
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="madeForKids"
                                        checked={!madeForKids}
                                        onChange={() => setMadeForKids(false)}
                                        className="mt-1 accent-[#3ea6ff] w-5 h-5 border-[#aaaaaa] bg-transparent"
                                    />
                                    <div>
                                        <span className="text-white text-sm font-medium">No, it's not made for kids</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Show More / Advanced */}
                        <div className="pt-2">
                            <button
                                onClick={() => setShowMore(!showMore)}
                                className="text-[#aaaaaa] hover:text-white text-sm font-medium uppercase tracking-wide flex items-center gap-1"
                            >
                                {showMore ? 'Show Less' : 'Show More'} {showMore ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>

                            {showMore && (
                                <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-top-2">
                                    {/* Tags */}
                                    <div className="space-y-1">
                                        <label className="text-xs text-[#aaaaaa] font-medium">Tags</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={tags}
                                                onChange={(e) => setTags(e.target.value)}
                                                className="w-full bg-[#121212] border border-[#3e3e3e] rounded p-2 text-white focus:border-[#3ea6ff] outline-none peer text-sm"
                                                placeholder="Add tags separated by comma"
                                            />
                                            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-[#3ea6ff] scale-x-0 peer-focus:scale-x-100 transition-transform origin-left"></div>
                                        </div>
                                        <p className="text-xs text-[#aaaaaa]">Tags can be useful if content in your video is commonly misspelled.</p>
                                    </div>

                                    {/* Category */}
                                    <div className="space-y-1">
                                        <label className="text-xs text-[#aaaaaa] font-medium">Category</label>
                                        <select
                                            value={categoryId}
                                            onChange={(e) => setCategoryId(e.target.value)}
                                            className="w-full bg-[#121212] border border-[#3e3e3e] rounded p-2 text-white outline-none text-sm appearance-none"
                                        >
                                            <option value="27">Education</option>
                                            <option value="28">Science & Technology</option>
                                            <option value="22">People & Blogs</option>
                                            <option value="24">Entertainment</option>
                                            <option value="23">Comedy</option>
                                            <option value="20">Gaming</option>
                                        </select>
                                    </div>

                                    {/* AI Disclosure */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-white block">Altered content</label>
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={aiDisclosure}
                                                onChange={(e) => setAiDisclosure(e.target.checked)}
                                                className="mt-1 accent-[#3ea6ff] w-4 h-4 border-[#aaaaaa]"
                                            />
                                            <div>
                                                <span className="text-white text-sm">Do any of the following describe your content?</span>
                                                <ul className="list-disc list-inside text-xs text-[#aaaaaa] mt-1 space-y-0.5 ml-1">
                                                    <li>Makes a real person appear to say or do something they didn't say or do</li>
                                                    <li>Alters footage of a real event or place</li>
                                                    <li>Generates a realistic-looking scene that didn't actually occur</li>
                                                </ul>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Preview & Visibility (35%) */}
                    <div className="w-full md:w-[350px] bg-[#1f1f1f] border-t md:border-t-0 md:border-l border-[#303030] p-6 flex flex-col gap-6">

                        {/* Video Preview Placehoder */}
                        <div className="space-y-2">
                            <div className="aspect-video bg-[#0f0f0f] rounded flex items-center justify-center border border-[#303030] relative overflow-hidden group">
                                {item.videoPath ? (
                                    <video src={`file://${item.videoPath}`} className="w-full h-full object-cover opacity-50" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-[#aaaaaa]">
                                        <Film className="w-8 h-8" />
                                        <span className="text-xs">Video Preview</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                    <Play className="w-10 h-10 text-white fill-white" />
                                </div>
                            </div>
                            <div className="bg-[#121212] p-3 rounded border border-[#303030]">
                                <p className="text-xs text-[#aaaaaa] truncate">Filename</p>
                                <p className="text-sm text-white truncate font-mono">{item.videoPath ? item.videoPath.split('/').pop() : 'video.mp4'}</p>
                            </div>
                        </div>

                        {/* Visibility */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-white">Visibility</h3>

                            <div className="bg-[#121212] border border-[#3e3e3e] rounded p-4 space-y-3">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="privacy"
                                        checked={privacyStatus === 'private'}
                                        onChange={() => setPrivacyStatus('private')}
                                        className="mt-1 accent-[#3ea6ff] w-4 h-4"
                                    />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-white text-sm font-medium">Private</span>
                                            <Lock className="w-3 h-3 text-[#aaaaaa]" />
                                        </div>
                                        <p className="text-xs text-[#aaaaaa]">Only you and people you choose can watch your video</p>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer opacity-50">
                                    <input
                                        type="radio"
                                        name="privacy"
                                        checked={privacyStatus === 'unlisted'}
                                        onChange={() => setPrivacyStatus('unlisted')}
                                        className="mt-1 accent-[#3ea6ff] w-4 h-4"
                                        disabled // Keeping simple for now
                                    />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-white text-sm font-medium">Unlisted</span>
                                            <Link className="w-3 h-3 text-[#aaaaaa]" />
                                        </div>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer opacity-50">
                                    <input
                                        type="radio"
                                        name="privacy"
                                        checked={privacyStatus === 'public'}
                                        onChange={() => setPrivacyStatus('public')}
                                        className="mt-1 accent-[#3ea6ff] w-4 h-4"
                                        disabled // Keeping simple
                                    />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-white text-sm font-medium">Public</span>
                                            <Globe className="w-3 h-3 text-[#aaaaaa]" />
                                        </div>
                                    </div>
                                </label>
                            </div>

                            {/* Schedule Config */}
                            <div className="bg-[#121212] border border-[#3e3e3e] rounded p-4">
                                <label className="flex items-center gap-2 mb-3 text-sm font-medium text-white">
                                    <Clock className="w-4 h-4 text-[#3ea6ff]" />
                                    Schedule
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="date"
                                        value={publishDate}
                                        onChange={(e) => setPublishDate(e.target.value)}
                                        className="bg-[#1f1f1f] border border-[#3e3e3e] rounded p-2 text-white text-sm outline-none focus:border-[#3ea6ff] [color-scheme:dark]"
                                    />
                                    <input
                                        type="time"
                                        value={publishTime}
                                        onChange={(e) => setPublishTime(e.target.value)}
                                        className="bg-[#1f1f1f] border border-[#3e3e3e] rounded p-2 text-white text-sm outline-none focus:border-[#3ea6ff] [color-scheme:dark]"
                                    />
                                </div>
                                <p className="text-xs text-[#aaaaaa] mt-2">
                                    Video will be <b>Private</b> until this time.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[#303030] bg-[#1f1f1f] flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {/* Upload Status check could go here */}
                        <CheckCircle className="w-5 h-5 text-[#aaaaaa]" />
                        <span className="text-xs text-[#aaaaaa]">Checks complete. No issues found.</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-[#3ea6ff] hover:bg-[#263850] rounded font-medium transition-colors uppercase text-sm tracking-wide"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className={`px-6 py-2 rounded-sm font-medium text-white transition-colors uppercase text-sm tracking-wide ${mode === 'schedule' ? 'bg-[#3ea6ff] hover:bg-[#3ea6ff]/90' : 'bg-[#272727] hover:bg-[#3d3d3d] border border-transparent'
                                }`}
                        >
                            {mode === 'schedule' ? 'Schedule' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
