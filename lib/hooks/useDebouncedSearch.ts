'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseDebouncedSearchOptions {
  delay?: number;
  minLength?: number;
  enabled?: boolean;
}

export function useDebouncedSearch(
  callback: (query: string) => void,
  options: UseDebouncedSearchOptions = {}
) {
  const {
    delay = 500,
    minLength = 1,
    enabled = true
  } = options;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastQueryRef = useRef<string>('');

  // 清除定时器的函数
  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // 执行搜索的函数
  const executeSearch = useCallback((query: string) => {
    if (!enabled) return;

    const trimmedQuery = query.trim();
    if (trimmedQuery.length >= minLength && trimmedQuery !== lastQueryRef.current) {
      lastQueryRef.current = trimmedQuery;
      callback(trimmedQuery);
    }
  }, [callback, minLength, enabled]);

  // 防抖搜索函数
  const debouncedSearch = useCallback((query: string) => {
    if (!enabled) return;

    // 立即清除之前的定时器
    clearTimer();

    // 如果查询为空或太短，立即清除
    const trimmedQuery = query.trim();
    if (trimmedQuery.length === 0 || trimmedQuery.length < minLength) {
      lastQueryRef.current = '';
      return;
    }

    // 设置新的定时器
    timeoutRef.current = setTimeout(() => {
      executeSearch(query);
    }, delay);
  }, [delay, minLength, enabled, clearTimer, executeSearch]);

  // 立即搜索（不防抖）
  const immediateSearch = useCallback((query: string) => {
    clearTimer();
    executeSearch(query);
  }, [clearTimer, executeSearch]);

  // 清理定时器
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    debouncedSearch,
    immediateSearch,
    clearTimer
  };
}