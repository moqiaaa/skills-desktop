import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSkillStore } from '../store/useSkillStore';
import { Trash2, Eye, FolderOpen, X, Github, HardDrive, Plus, ExternalLink, RefreshCw, AlertCircle, CheckCircle, Package, Calendar, Download, CheckSquare, Square, Search, Tag, Pencil } from 'lucide-react';
import type { InstalledSkill } from '../types';
import { invoke } from '@tauri-apps/api/core';

const MySkills = () => {
  const { t, i18n } = useTranslation();
  const {
    installedSkills,
    scanLocalSkills,
    importFromGithub,
    importFromLocal,
    updateSelectedSkills,
    checkSkillUpdates,
    reinstallSkill,
    saveSkillMetadata,
    isCheckingUpdates,
    isUpdating
  } = useSkillStore();
  const [activeTab, setActiveTab] = useState<'all' | 'system' | 'project'>('all');
  const [selectedSkill, setSelectedSkill] = useState<InstalledSkill | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [skillContent, setSkillContent] = useState<string>('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'github' | 'local' | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [importPath, setImportPath] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{show: boolean, success: boolean, message: string}>({show: false, success: false, message: ''});

  // 多选状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [updateResult, setUpdateResult] = useState<{show: boolean, success: number, failed: number} | null>(null);
  const [updatingSkillId, setUpdatingSkillId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<InstalledSkill | null>(null);
  const [editingNote, setEditingNote] = useState('');
  const [editingTagsInput, setEditingTagsInput] = useState('');
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);

  const handleUninstall = async (skill: InstalledSkill) => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      const result: any = await invoke('uninstall_skill', {
        request: {
          skillPath: skill.localPath
        }
      });

      if (result.success) {
        setDeleteResult({show: true, success: true, message: `${skill.name} ${i18n.language === 'zh' ? '已成功删除' : 'deleted successfully'}`});
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(skill.id);
          return next;
        });
        await scanLocalSkills();
      } else {
        setDeleteResult({show: true, success: false, message: `${i18n.language === 'zh' ? '删除失败' : 'Delete failed'}: ${result.message}`});
      }
    } catch (error: any) {
      const errMsg = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
      setDeleteResult({show: true, success: false, message: `${i18n.language === 'zh' ? '删除出错' : 'Delete error'}: ${errMsg}`});
    } finally {
      setIsDeleting(false);
      setTimeout(() => setDeleteResult({show: false, success: false, message: ''}), 3000);
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (isDeleting || selectedIds.size === 0) return;

    setIsDeleting(true);
    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds) {
      const skill = installedSkills.find(s => s.id === id);
      if (!skill) continue;

      try {
        const result: any = await invoke('uninstall_skill', {
          request: { skillPath: skill.localPath }
        });
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setDeleteResult({
      show: true,
      success: failCount === 0,
      message: i18n.language === 'zh'
        ? `删除完成：${successCount} 成功，${failCount} 失败`
        : `Delete complete: ${successCount} succeeded, ${failCount} failed`
    });
    setSelectedIds(new Set());
    await scanLocalSkills();
    setIsDeleting(false);
    setTimeout(() => setDeleteResult({show: false, success: false, message: ''}), 3000);
  };

  // 单个更新
  const handleSingleUpdate = async (skillId: string) => {
    setUpdatingSkillId(skillId);
    try {
      await reinstallSkill(skillId);
      setDeleteResult({
        show: true,
        success: true,
        message: i18n.language === 'zh' ? '更新成功' : 'Update successful'
      });
    } catch {
      setDeleteResult({
        show: true,
        success: false,
        message: i18n.language === 'zh' ? '更新失败' : 'Update failed'
      });
    } finally {
      setUpdatingSkillId(null);
      setTimeout(() => setDeleteResult({show: false, success: false, message: ''}), 3000);
    }
  };

  useEffect(() => {
    scanLocalSkills();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const parseTagsInput = (input: string) => (
    Array.from(
      new Set(
        input
          .split(',')
          .map(tag => tag.trim())
          .filter(Boolean)
      )
    )
  );

  const openMetadataModal = (skill: InstalledSkill) => {
    setEditingSkill(skill);
    setEditingNote(skill.note || '');
    setEditingTagsInput((skill.tags || []).join(', '));
    setShowMetadataModal(true);
  };

  const handleSaveMetadata = async () => {
    if (!editingSkill || isSavingMetadata) return;
    setIsSavingMetadata(true);

    try {
      const tags = parseTagsInput(editingTagsInput);
      await saveSkillMetadata(editingSkill.id, editingNote, tags);

      if (selectedSkill?.id === editingSkill.id) {
        setSelectedSkill({
          ...selectedSkill,
          note: editingNote.trim(),
          tags
        });
      }

      setDeleteResult({
        show: true,
        success: true,
        message: i18n.language === 'zh' ? '备注和标签已保存' : 'Note and tags saved'
      });
      setShowMetadataModal(false);
      setEditingSkill(null);
      setEditingNote('');
      setEditingTagsInput('');
      setTimeout(() => setDeleteResult({show: false, success: false, message: ''}), 3000);
    } catch (error: any) {
      const errMsg = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
      setDeleteResult({
        show: true,
        success: false,
        message: `${i18n.language === 'zh' ? '保存失败' : 'Save failed'}: ${errMsg}`
      });
      setTimeout(() => setDeleteResult({show: false, success: false, message: ''}), 3000);
    } finally {
      setIsSavingMetadata(false);
    }
  };

  const filteredSkills = installedSkills.filter(skill => {
    const tabMatched = activeTab === 'all' || skill.type === activeTab;
    if (!tabMatched) return false;

    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    const inTags = (skill.tags || []).some(tag => tag.toLowerCase().includes(query));
    const inNote = (skill.note || '').toLowerCase().includes(query);
    const inName = skill.name.toLowerCase().includes(query);
    const inDescription = (skill.description || '').toLowerCase().includes(query);

    return inTags || inNote || inName || inDescription;
  });

  const handleViewSkill = async (skill: InstalledSkill) => {
    setSelectedSkill(skill);
    setShowViewModal(true);

    try {
      const content = await invoke<string>('read_skill', {
        skillPath: skill.localPath
      });
      setSkillContent(content);
    } catch (error) {
      console.error('Failed to load skill content:', error);
      setSkillContent(`# ${skill.name}\n\n${skill.description}\n\n**${i18n.language === 'zh' ? '版本' : 'Version'}**: ${skill.version}\n**${i18n.language === 'zh' ? '作者' : 'Author'}**: ${skill.author}\n\n**${i18n.language === 'zh' ? '路径' : 'Path'}**: ${skill.localPath}`);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      if (importType === 'github') {
        await importFromGithub(importUrl);
        alert(i18n.language === 'zh' ? '成功从 GitHub 导入 Skill！' : 'Successfully imported from GitHub!');
      } else if (importType === 'local') {
        await importFromLocal(importPath);
        alert(i18n.language === 'zh' ? '成功从本地导入 Skill！' : 'Successfully imported from local!');
      }
      setShowImportModal(false);
      setImportUrl('');
      setImportPath('');
      setImportType(null);
    } catch (error: any) {
      alert(`${i18n.language === 'zh' ? '导入失败' : 'Import failed'}: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportType(null);
    setImportUrl('');
    setImportPath('');
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSourceIcon = (source?: string) => {
    switch (source) {
      case 'marketplace':
        return <Package size={14} className="text-primary" />;
      case 'github':
        return <Github size={14} className="text-base-content/60" />;
      case 'local':
        return <HardDrive size={14} className="text-base-content/60" />;
      default:
        return <FolderOpen size={14} className="text-base-content/60" />;
    }
  };

  const getSourceLabel = (source?: string) => {
    switch (source) {
      case 'marketplace':
        return i18n.language === 'zh' ? '市场' : 'Marketplace';
      case 'github':
        return 'GitHub';
      case 'local':
        return i18n.language === 'zh' ? '本地' : 'Local';
      default:
        return i18n.language === 'zh' ? '未知' : 'Unknown';
    }
  };

  // 多选操作
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredSkills.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSkills.map(s => s.id)));
    }
  };

  const handleBatchUpdate = async () => {
    const idsToUpdate = Array.from(selectedIds);
    const result = await updateSelectedSkills(idsToUpdate);
    setUpdateResult({
      show: true,
      success: result.success.length,
      failed: result.failed.length
    });
    setSelectedIds(new Set());
    setTimeout(() => setUpdateResult(null), 5000);
  };

  // 获取可更新的选中 Skills
  const updatableSelected = Array.from(selectedIds).filter(id => {
    const skill = installedSkills.find(s => s.id === id);
    return skill?.sourceUrl;
  });

  return (
    <div className="space-y-4">
      {/* Toast Notifications */}
      {deleteResult.show && (
        <div className="toast toast-top toast-end z-50">
          <div className={`alert ${deleteResult.success ? 'alert-success' : 'alert-error'} shadow-lg rounded-2xl`}>
            <span>{deleteResult.message}</span>
          </div>
        </div>
      )}

      {updateResult?.show && (
        <div className="toast toast-top toast-end z-50">
          <div className="alert alert-info shadow-lg rounded-2xl">
            <span>
              {i18n.language === 'zh'
                ? `更新完成：{updateResult.success} 成功，{updateResult.failed} 失败`
                : `Update complete: ${updateResult.success} succeeded, ${updateResult.failed} failed`}
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-primary to-violet-500 rounded-xl">
            <Package size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{t('mySkills')}</h2>
            <p className="text-sm text-base-content/60">
              {installedSkills.length} {i18n.language === 'zh' ? '个已安装' : 'installed'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-ghost btn-sm gap-2 rounded-xl"
            onClick={() => checkSkillUpdates()}
            disabled={isCheckingUpdates}
          >
            {isCheckingUpdates ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <RefreshCw size={16} />
            )}
            {i18n.language === 'zh' ? '检查更新' : 'Check Updates'}
          </button>
          <button
            className="btn btn-primary gap-2 rounded-xl shadow-lg shadow-primary/25"
            onClick={() => setShowImportModal(true)}
          >
            <Plus size={18} />
            {t('importSkill')}
          </button>
        </div>
      </div>

      {/* Tabs & Batch Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div role="tablist" className="tabs tabs-boxed bg-base-200 p-1 rounded-xl">
          <a
            role="tab"
            className={`tab rounded-lg text-sm ${activeTab === 'all' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            {i18n.language === 'zh' ? '全部' : 'All'} ({installedSkills.length})
          </a>
          <a
            role="tab"
            className={`tab rounded-lg text-sm ${activeTab === 'system' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            {t('systemLevel')} ({installedSkills.filter(s => s.type === 'system').length})
          </a>
          <a
            role="tab"
            className={`tab rounded-lg text-sm ${activeTab === 'project' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('project')}
          >
            {t('projectLevel')} ({installedSkills.filter(s => s.type === 'project').length})
          </a>
        </div>

        {/* Batch Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-base-content/60">
              {selectedIds.size} {i18n.language === 'zh' ? '个已选' : 'selected'}
            </span>
            <button
              className="btn btn-sm btn-primary gap-2 rounded-lg"
              onClick={handleBatchUpdate}
              disabled={isUpdating || updatableSelected.length === 0}
            >
              {isUpdating ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <Download size={14} />
              )}
              {i18n.language === 'zh' ? '批量更新' : 'Update'}
              {updatableSelected.length > 0 && ` (${updatableSelected.length})`}
            </button>
            <button
              className="btn btn-sm btn-error btn-outline gap-2 rounded-lg"
              onClick={handleBatchDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <Trash2 size={14} />
              )}
              {i18n.language === 'zh' ? '批量删除' : 'Delete'}
            </button>
            <button
              className="btn btn-sm btn-ghost rounded-lg"
              onClick={() => setSelectedIds(new Set())}
            >
              {i18n.language === 'zh' ? '取消' : 'Cancel'}
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <label className="input input-bordered input-sm w-full max-w-md rounded-xl flex items-center gap-2">
          <Search size={14} className="opacity-60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="grow"
            placeholder={i18n.language === 'zh' ? '搜索名称、备注、标签' : 'Search name, note, or tags'}
          />
        </label>
      </div>

      {/* Skills List */}
      {filteredSkills.length > 0 ? (
        <div className="bg-base-200/50 rounded-2xl border border-base-300 overflow-hidden">
          {/* List Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-base-200/80 border-b border-base-300 text-xs font-semibold text-base-content/60 uppercase tracking-wider">
            <button
              className="shrink-0"
              onClick={toggleSelectAll}
            >
              {selectedIds.size === filteredSkills.length ? (
                <CheckSquare size={16} className="text-primary" />
              ) : (
                <Square size={16} />
              )}
            </button>
            <div className="flex-1 min-w-0">{i18n.language === 'zh' ? '名称' : 'Name'}</div>
            <div className="w-24 text-center hidden sm:block">{i18n.language === 'zh' ? '来源' : 'Source'}</div>
            <div className="w-24 text-center hidden md:block">{i18n.language === 'zh' ? '安装时间' : 'Installed'}</div>
            <div className="w-20 text-center hidden lg:block">{i18n.language === 'zh' ? '状态' : 'Status'}</div>
            <div className="w-40 text-right">{i18n.language === 'zh' ? '操作' : 'Actions'}</div>
          </div>

          {/* List Items */}
          <div className="divide-y divide-base-300">
            {filteredSkills.map((skill) => (
              <div
                key={skill.id}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-base-200/50 transition-colors ${
                  selectedIds.has(skill.id) ? 'bg-primary/5' : ''
                }`}
              >
                {/* Checkbox */}
                <button
                  className="shrink-0"
                  onClick={() => toggleSelect(skill.id)}
                >
                  {selectedIds.has(skill.id) ? (
                    <CheckSquare size={16} className="text-primary" />
                  ) : (
                    <Square size={16} className="text-base-content/40" />
                  )}
                </button>

                {/* Name & Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{skill.name}</span>
                    {skill.version && (
                      <span className="badge badge-ghost badge-xs font-mono">v{skill.version}</span>
                    )}
                    {skill.type === 'system' ? (
                      <span className="badge badge-neutral badge-xs">{t('system')}</span>
                    ) : (
                      <span className="badge badge-accent badge-outline badge-xs">{t('project')}</span>
                    )}
                    {skill.hasUpdate && (
                      <span className="badge badge-warning badge-xs gap-0.5">
                        <RefreshCw size={8} />
                        {i18n.language === 'zh' ? '可更新' : 'Update'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-base-content/50 truncate" title={skill.description}>
                    {skill.description}
                  </p>
                  {(skill.note || (skill.tags && skill.tags.length > 0)) && (
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {skill.note && (
                        <span
                          className="inline-flex items-center gap-1 text-xs text-base-content/70 bg-base-100 border border-base-300 rounded-full px-2 py-0.5 max-w-full"
                          title={skill.note}
                        >
                          <span className="truncate">{skill.note}</span>
                        </span>
                      )}
                      {(skill.tags || []).map((tag) => (
                        <span
                          key={`${skill.id}-${tag}`}
                          className="inline-flex items-center gap-1 text-xs text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5"
                        >
                          <Tag size={10} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Source - Clickable */}
                <div className="w-24 hidden sm:flex items-center justify-center">
                  {skill.sourceUrl ? (
                    <button
                      className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                      onClick={() => invoke('open_url', { url: skill.sourceUrl })}
                      title={skill.sourceUrl}
                    >
                      {getSourceIcon(skill.source)}
                      <span>{getSourceLabel(skill.source)}</span>
                      <ExternalLink size={10} />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-base-content/60">
                      {getSourceIcon(skill.source)}
                      <span>{getSourceLabel(skill.source)}</span>
                    </div>
                  )}
                </div>

                {/* Install Date */}
                <div className="w-24 hidden md:flex items-center justify-center gap-1 text-xs text-base-content/50">
                  <Calendar size={12} />
                  <span>{formatDate(skill.installDate)}</span>
                </div>

                {/* Status */}
                <div className="w-20 hidden lg:flex justify-center">
                  {skill.status === 'safe' && (
                    <span className="badge badge-success badge-xs gap-0.5">
                      <CheckCircle size={10} />
                      {i18n.language === 'zh' ? '安全' : 'Safe'}
                    </span>
                  )}
                  {skill.status === 'unsafe' && (
                    <span className="badge badge-error badge-xs gap-0.5">
                      <AlertCircle size={10} />
                      {i18n.language === 'zh' ? '风险' : 'Unsafe'}
                    </span>
                  )}
                </div>

                {/* Actions - Increased spacing */}
                <div className="w-40 flex items-center justify-end gap-2">
                  {/* Update button for skills with sourceUrl */}
                  {skill.sourceUrl && (
                    <button
                      className="btn btn-ghost btn-xs gap-1 rounded-lg text-primary hover:bg-primary/10"
                      onClick={() => handleSingleUpdate(skill.id)}
                      disabled={updatingSkillId === skill.id}
                      title={i18n.language === 'zh' ? '更新' : 'Update'}
                    >
                      {updatingSkillId === skill.id ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        <Download size={14} />
                      )}
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-xs rounded-lg"
                    onClick={() => openMetadataModal(skill)}
                    title={i18n.language === 'zh' ? '编辑备注标签' : 'Edit note/tags'}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="btn btn-ghost btn-xs rounded-lg"
                    onClick={() => handleViewSkill(skill)}
                    title={t('view')}
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    className="btn btn-ghost btn-xs text-error rounded-lg hover:bg-error/10"
                    onClick={() => handleUninstall(skill)}
                    disabled={isDeleting}
                    title={t('remove')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-base-200/50 rounded-2xl border border-base-300 p-12 text-center">
          <FolderOpen size={48} strokeWidth={1} className="mx-auto mb-3 opacity-50 text-base-content/40" />
          <p className="text-base-content/50">
            {i18n.language === 'zh'
              ? `No ${activeTab !== 'all' ? activeTab : ''} Skills`
              : `No ${activeTab !== 'all' ? activeTab : ''} Skills found`}
          </p>
          <p className="text-sm mt-2 text-base-content/40">
            {i18n.language === 'zh' ? '从市场安装或导入 Skills' : 'Install from marketplace or import Skills'}
          </p>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedSkill && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl">
            {/* Header */}
            <div className="flex justify-between items-start p-6 border-b border-base-200 bg-base-100 shrink-0">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-xl flex items-center gap-2">
                  {selectedSkill.name}
                  {selectedSkill.version && (
                    <span className="badge badge-ghost badge-sm font-mono">v{selectedSkill.version}</span>
                  )}
                </h3>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <span className="text-xs text-base-content/50 font-mono">
                    {selectedSkill.localPath}
                  </span>
                </div>
                {/* Metadata row */}
                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-base-content/60">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {formatDate(selectedSkill.installDate)}
                  </span>
                  {selectedSkill.sourceUrl ? (
                    <button
                      className="flex items-center gap-1 text-primary hover:underline"
                      onClick={() => invoke('open_url', { url: selectedSkill.sourceUrl })}
                    >
                      {getSourceIcon(selectedSkill.source)}
                      {getSourceLabel(selectedSkill.source)}
                      <ExternalLink size={10} />
                    </button>
                  ) : (
                    <span className="flex items-center gap-1">
                      {getSourceIcon(selectedSkill.source)}
                      {getSourceLabel(selectedSkill.source)}
                    </span>
                  )}
                  {selectedSkill.author && (
                    <span className="flex items-center gap-1">
                      {i18n.language === 'zh' ? '作者' : 'Author'}: {selectedSkill.author}
                    </span>
                  )}
                  {selectedSkill.note && (
                    <span className="flex items-center gap-1">
                      {i18n.language === 'zh' ? '备注' : 'Note'}: {selectedSkill.note}
                    </span>
                  )}
                  {(selectedSkill.tags || []).length > 0 && (
                    <span className="flex items-center gap-1">
                      {i18n.language === 'zh' ? '标签' : 'Tags'}: {(selectedSkill.tags || []).join(', ')}
                    </span>
                  )}
                </div>
              </div>
              <button
                className="btn btn-sm btn-circle btn-ghost"
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedSkill(null);
                  setSkillContent('');
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-base-200 p-6">
              <div className="prose prose-sm max-w-none bg-base-100 p-6 rounded-xl shadow-sm">
                <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed font-mono bg-transparent">
                  {skillContent || (i18n.language === 'zh' ? '加载中...' : 'Loading...')}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-base-200 bg-base-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                {selectedSkill.sourceUrl && (
                  <>
                    <button
                      className="btn btn-ghost btn-sm gap-2 rounded-xl"
                      onClick={() => invoke('open_url', { url: selectedSkill.sourceUrl })}
                    >
                      <ExternalLink size={14} />
                      {i18n.language === 'zh' ? '查看源码' : 'View Source'}
                    </button>
                    <button
                      className="btn btn-primary btn-sm gap-2 rounded-xl"
                      onClick={() => handleSingleUpdate(selectedSkill.id)}
                      disabled={updatingSkillId === selectedSkill.id}
                    >
                      {updatingSkillId === selectedSkill.id ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        <Download size={14} />
                      )}
                      {i18n.language === 'zh' ? '重新下载' : 'Re-download'}
                    </button>
                  </>
                )}
              </div>
              <button
                className="btn rounded-xl"
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedSkill(null);
                  setSkillContent('');
                }}
              >
                {i18n.language === 'zh' ? '关闭' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMetadataModal && editingSkill && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg rounded-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-xl">
                  {i18n.language === 'zh' ? '编辑备注和标签' : 'Edit Note & Tags'}
                </h3>
                <p className="text-sm text-base-content/50 mt-1">{editingSkill.name}</p>
              </div>
              <button
                className="btn btn-sm btn-circle btn-ghost"
                onClick={() => {
                  if (isSavingMetadata) return;
                  setShowMetadataModal(false);
                  setEditingSkill(null);
                  setEditingNote('');
                  setEditingTagsInput('');
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-semibold">{i18n.language === 'zh' ? '备注' : 'Note'}</span>
                </label>
                <textarea
                  className="textarea textarea-bordered rounded-xl min-h-[110px]"
                  value={editingNote}
                  onChange={(e) => setEditingNote(e.target.value)}
                  maxLength={500}
                  placeholder={i18n.language === 'zh' ? '给这个 skill 写一点备注...' : 'Write a note for this skill...'}
                />
              </div>

              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-semibold">{i18n.language === 'zh' ? '标签' : 'Tags'}</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered rounded-xl"
                  value={editingTagsInput}
                  onChange={(e) => setEditingTagsInput(e.target.value)}
                  placeholder={i18n.language === 'zh' ? '用英文逗号分隔，例如：工作, 常用, 调试' : 'Comma-separated, e.g. work, daily, debug'}
                />
                <label className="label pt-1">
                  <span className="label-text-alt text-base-content/50">
                    {i18n.language === 'zh' ? '标签可用于搜索和筛选' : 'Tags are searchable in My Skills'}
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  className="btn btn-ghost rounded-xl"
                  onClick={() => {
                    if (isSavingMetadata) return;
                    setShowMetadataModal(false);
                    setEditingSkill(null);
                    setEditingNote('');
                    setEditingTagsInput('');
                  }}
                >
                  {i18n.language === 'zh' ? '取消' : 'Cancel'}
                </button>
                <button
                  className="btn btn-primary rounded-xl shadow-lg shadow-primary/25"
                  onClick={handleSaveMetadata}
                  disabled={isSavingMetadata}
                >
                  {isSavingMetadata ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    i18n.language === 'zh' ? '保存' : 'Save'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg rounded-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">{t('importSkill')}</h3>
              <button
                className="btn btn-sm btn-circle btn-ghost"
                onClick={closeImportModal}
              >
                <X size={20} />
              </button>
            </div>

            {!importType ? (
              <div className="space-y-3">
                <p className="text-sm text-base-content/60 mb-4">
                  {i18n.language === 'zh' ? '选择导入方式：' : 'Select import method:'}
                </p>

                <div
                  className="card bg-base-200 hover:bg-base-300 cursor-pointer transition-colors p-4 rounded-xl"
                  onClick={() => setImportType('github')}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-base-100 flex items-center justify-center shrink-0">
                      <Github size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-base mb-1">{t('importFromGitHub')}</div>
                      <div className="text-sm text-base-content/60">
                        {i18n.language === 'zh'
                          ? 'Input GitHub repository URL (repo or subdirectory)'
                          : 'Enter GitHub repository URL, supports full repo or subdirectory'}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="card bg-base-200 hover:bg-base-300 cursor-pointer transition-colors p-4 rounded-xl"
                  onClick={() => setImportType('local')}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-base-100 flex items-center justify-center shrink-0">
                      <HardDrive size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-base mb-1">{t('importFromLocal')}</div>
                      <div className="text-sm text-base-content/60">
                        {i18n.language === 'zh'
                          ? '选择本地文件夹路径，必须包含 SKILL.md 文件'
                          : 'Select local folder path, must contain SKILL.md file'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="alert alert-info rounded-xl">
                  <div className="flex items-center gap-3">
                    {importType === 'github' ? <Github size={20} /> : <HardDrive size={20} />}
                    <span className="text-sm">
                      {importType === 'github' ? t('importFromGitHub') : t('importFromLocal')}
                    </span>
                  </div>
                </div>

                {importType === 'github' ? (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">
                        {i18n.language === 'zh' ? 'GitHub 仓库 URL' : 'GitHub Repository URL'}
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="https://github.com/username/skill-name"
                      className="input input-bordered w-full rounded-xl"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      autoFocus
                    />
                    <label className="label">
                      <span className="label-text-alt text-base-content/50">
                        {i18n.language === 'zh'
                          ? '仓库必须包含 SKILL.md 文件'
                          : 'Repository must contain SKILL.md file'}
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">
                        {i18n.language === 'zh' ? '本地文件夹路径' : 'Local Folder Path'}
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="/Users/user/Downloads/my-skill"
                        className="input input-bordered flex-1 rounded-xl"
                        value={importPath}
                        onChange={(e) => setImportPath(e.target.value)}
                        autoFocus
                      />
                      <button
                        className="btn btn-ghost rounded-xl gap-1"
                        onClick={async () => {
                          try {
                            const folder = await invoke<string | null>('pick_folder');
                            if (folder) setImportPath(folder);
                          } catch (e) {
                            console.error('Failed to pick folder:', e);
                          }
                        }}
                      >
                        <FolderOpen size={16} />
                        {i18n.language === 'zh' ? '浏览' : 'Browse'}
                      </button>
                    </div>
                    <label className="label">
                      <span className="label-text-alt text-base-content/50">
                        {i18n.language === 'zh'
                          ? '文件夹必须包含 SKILL.md 文件'
                          : 'Folder must contain SKILL.md file'}
                      </span>
                    </label>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    className="btn btn-ghost rounded-xl"
                    onClick={() => {
                      setImportType(null);
                      setImportUrl('');
                      setImportPath('');
                    }}
                  >
                    {i18n.language === 'zh' ? '返回' : 'Back'}
                  </button>
                  <button
                    className="btn btn-primary rounded-xl shadow-lg shadow-primary/25"
                    onClick={handleImport}
                    disabled={isImporting || (importType === 'github' ? !importUrl.trim() : !importPath.trim())}
                  >
                    {isImporting ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        {t('importing')}
                      </>
                    ) : (
                      <>
                        <Plus size={18} />
                        {i18n.language === 'zh' ? '确认导入' : 'Confirm Import'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MySkills;
