'use client';

import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

interface NoResultsProps {
  onReset: () => void;
  onRetry?: () => void;
  searchStats?: {
    totalSources: number;
    completedSources: number;
    query: string;
  };
  error?: string;
}

export function NoResults({ onReset, onRetry, searchStats, error }: NoResultsProps) {
  return (
    <div className="text-center py-20 animate-fade-in">
      <div
        className="inline-flex items-center justify-center w-32 h-32 bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] mb-6 rounded-[var(--radius-full)]"
      >
        <Icons.Search size={64} className="text-[var(--text-color-secondary)]" />
      </div>
      <h3 className="text-3xl font-bold text-[var(--text-color)] mb-4">
        {error ? "搜索出错" : "未找到相关内容"}
      </h3>

      {/* 搜索统计信息 */}
      {searchStats && (
        <div className="text-sm text-[var(--text-color-secondary)] mb-4">
          已搜索 {searchStats.completedSources}/{searchStats.totalSources} 个源
        </div>
      )}

      <p className="text-lg text-[var(--text-color-secondary)] mb-6">
        {error ? error : "试试其他关键词、检查拼写，或使用更通用的词汇"}
      </p>

      {/* 建议搜索词 */}
      <div className="mt-4 text-sm">
        <p className="text-[var(--text-color-secondary)] mb-2">建议尝试：</p>
        <div className="flex gap-2 justify-center flex-wrap px-8">
          <Button variant="ghost" className="text-sm px-3 py-1" onClick={() => onReset()}>
            使用完整名称
          </Button>
          <Button variant="ghost" className="text-sm px-3 py-1" onClick={() => onReset()}>
            简化关键词
          </Button>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="mt-6 flex gap-3 justify-center">
        {onRetry && (
          <Button variant="primary" onClick={onRetry}>
            重新搜索
          </Button>
        )}
        <Button variant="secondary" onClick={onReset}>
          返回首页
        </Button>
      </div>
    </div>
  );
}
