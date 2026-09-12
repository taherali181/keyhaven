'use client';

import React from 'react';
import { CaretStyle } from '@/types';

interface CaretProps {
  style?: CaretStyle;
}

export const Caret: React.FC<CaretProps> = ({ style = 'smooth' }) => {
  return <span aria-hidden="true" className={`typing-caret typing-caret-${style}`} />;
};
