'use client';
import { useEffect } from 'react';
import { startUserMemory } from '@/lib/user-memory-client';
export function UserMemoryProvider() { useEffect(startUserMemory, []); return null; }
